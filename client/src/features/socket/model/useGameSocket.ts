import type { GameEndResponse } from '@/entities/gameResult';
import { useGameStore, type GameRoom } from '@/entities/gameRoom';
import type { Player } from '@/entities/player/model';
import type {
  RoundReplayResponse,
  RoundStandingResponse,
} from '@/entities/roundResult';
import type { Stroke } from '@/entities/similarity';
import { useChatStore, type ChatMessage } from '@/features/chat';
import type { WaitlistResponse } from '@/features/waitingRoomActions';
import { disconnectSocket, getSocket } from '@/shared/api';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@/shared/config';
import { useToastStore } from '@/shared/model';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  buildRankings,
  processRoomMetadata,
  type ServerRankingEntry,
} from '../lib/socketHandlers';

export const useGameSocket = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // 닉네임, profileId 상태 추적 - localStorage 변경 감지
  const [nickname, setNickname] = useState<string | null>(() =>
    localStorage.getItem('nickname'),
  );
  const [profileId, setProfileId] = useState<string | null>(() =>
    localStorage.getItem('profileId'),
  );

  // Zustand actions
  const setMySocketId = useGameStore((state) => state.setMySocketId);
  const setConnected = useGameStore((state) => state.setConnected);
  const updateRoom = useGameStore((state) => state.updateRoom);
  const setTimer = useGameStore((state) => state.setTimer);
  const setLiveRankings = useGameStore((state) => state.setLiveRankings);
  const setRoundResults = useGameStore((state) => state.setRoundResults);
  const setStandingResults = useGameStore((state) => state.setStandingResults);
  const setFinalResults = useGameStore((state) => state.setFinalResults);
  const setHighlight = useGameStore((state) => state.setHighlight);
  const setPromptStrokes = useGameStore((state) => state.setPromptStrokes);
  const setIsInWaitlist = useGameStore((state) => state.setIsInWaitlist);
  const setIsPracticing = useGameStore((state) => state.setIsPracticing);
  const setPracticePrompt = useGameStore((state) => state.setPracticePrompt);
  const setGameProgress = useGameStore((state) => state.setGameProgress);
  const setAlertMessage = useGameStore((state) => state.setAlertMessage);
  const setPendingNavigation = useGameStore(
    (state) => state.setPendingNavigation,
  );
  const reset = useGameStore((state) => state.reset);
  const addToast = useToastStore((state) => state.addToast);

  // Chat store 액션
  const addChatMessage = useChatStore((state) => state.addMessage);
  const setChatHistory = useChatStore((state) => state.setHistory);
  const clearChat = useChatStore((state) => state.clear);

  // localStorage 변경 감지
  useEffect(() => {
    const checkLocalStorage = () => {
      const storedNickname = localStorage.getItem('nickname');
      const storedProfileId = localStorage.getItem('profileId');
      setNickname(storedNickname);
      setProfileId(storedProfileId);
    };

    // storage 이벤트 리스너 (다른 탭에서 변경 시)
    globalThis.addEventListener('storage', checkLocalStorage);

    // 같은 탭에서 변경 감지를 위한 interval
    const interval = setInterval(checkLocalStorage, 100);

    return () => {
      globalThis.removeEventListener('storage', checkLocalStorage);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!roomId) {
      console.error('roomId가 없습니다');
      navigate('/');
      return;
    }

    // 닉네임 또는 profileId가 없으면 소켓 연결하지 않음
    if (!nickname || !profileId) {
      console.log('닉네임 또는 profileId가 없어서 소켓 연결 대기 중...');
      return;
    }

    const socket = getSocket();

    // 연결
    socket.connect();

    // 연결 이벤트
    socket.on('connect', () => {
      setMySocketId(socket.id!);
      setConnected(true);

      // 방 입장
      socket.emit(SERVER_EVENTS.USER_JOIN, { roomId, nickname, profileId });
    });

    socket.on('disconnect', () => {
      setMySocketId(null);
      setConnected(false);
    });

    // 방 정보 업데이트
    socket.on(CLIENT_EVENTS.ROOM_METADATA, (data: GameRoom) => {
      const { phase: currentPhase, mySocketId } = useGameStore.getState();
      const result = processRoomMetadata(data, currentPhase, mySocketId!);

      if (result.shouldResetGameData) {
        useGameStore.setState({
          liveRankings: [],
          roundResults: [],
          previousStandingResults: [],
          standingResults: [],
          finalResults: [],
          highlight: null,
          promptStrokes: [],
        });
      }

      if (result.isJoined) {
        setIsInWaitlist(false);
        setIsPracticing(false);
      }

      updateRoom(result.roomUpdate);
    });

    // 추방
    socket.on(
      CLIENT_EVENTS.ROOM_KICKED,
      ({ kickedPlayer }: { kickedPlayer: Omit<Player, 'isHost'> }) => {
        const mySocketId = useGameStore.getState().mySocketId;
        if (mySocketId === kickedPlayer.socketId) {
          disconnectSocket();
          reset();
          navigate('/');
          addToast(`방에서 퇴장당했습니다.`, 'error');
        } else {
          addToast(`${kickedPlayer.nickname}님이 퇴장당했습니다.`, 'info');
        }
      },
    );

    // 실시간 데이터
    socket.on(
      CLIENT_EVENTS.ROOM_TIMER,
      ({ timeLeft }: { timeLeft: number }) => {
        setTimer(timeLeft);
      },
    );

    socket.on(
      CLIENT_EVENTS.ROOM_LEADERBOARD,
      (data: { rankings: ServerRankingEntry[] }) => {
        const currentRankings = useGameStore.getState().liveRankings;
        setLiveRankings(buildRankings(data.rankings, currentRankings));
      },
    );

    socket.on(CLIENT_EVENTS.ROOM_PROMPT, (promptStrokes: Stroke[]) => {
      setPromptStrokes(promptStrokes);
    });

    // 결과
    socket.on(
      CLIENT_EVENTS.ROOM_ROUND_REPLAY,
      (response: RoundReplayResponse) => {
        setRoundResults(response.rankings);
        setPromptStrokes(response.promptStrokes);
      },
    );

    socket.on(
      CLIENT_EVENTS.ROOM_ROUND_STANDING,
      (response: RoundStandingResponse) => {
        setStandingResults(response.rankings);
      },
    );

    socket.on(CLIENT_EVENTS.ROOM_GAME_END, (response: GameEndResponse) => {
      setFinalResults(response.finalRankings);
      setHighlight(response.highlight);
    });

    // 대기열에 추가됨
    socket.on(
      CLIENT_EVENTS.USER_WAITLIST,
      ({ currentRound, totalRounds }: WaitlistResponse) => {
        setIsInWaitlist(true);
        setGameProgress({ currentRound, totalRounds });
        // setAlertMessage(
        //   '현재 게임이 진행 중입니다. 다음 라운드부터 참여할 수 있습니다.',
        // );
      },
    );

    socket.on(
      CLIENT_EVENTS.USER_PRACTICE_STARTED,
      (promptStrokes: Stroke[]) => {
        setPracticePrompt(promptStrokes);
        setIsPracticing(true);
      },
    );

    // 에러: 모달 확인 후 메인 페이지로 이동
    socket.on(CLIENT_EVENTS.ERROR, (error: { message: string }) => {
      setAlertMessage(error.message);
      setPendingNavigation('/');
    });

    // 채팅 이벤트
    socket.on(CLIENT_EVENTS.CHAT_BROADCAST, (message: ChatMessage) => {
      addChatMessage(message);
    });

    socket.on(
      CLIENT_EVENTS.CHAT_HISTORY,
      (payload: { roomId: string; messages: ChatMessage[] }) => {
        setChatHistory(payload.messages);
      },
    );

    socket.on(CLIENT_EVENTS.CHAT_ERROR, (error: { message: string }) => {
      // 채팅 에러는 해당 유저의 채팅창에만 시스템 메시지로 표시
      const errorMessage: ChatMessage = {
        type: 'system',
        message: error.message,
        timestamp: Date.now(),
        systemType: 'timer_warning', // 경고 스타일로 표시
      };
      addChatMessage(errorMessage);
    });

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off(CLIENT_EVENTS.ROOM_METADATA);
      socket.off(CLIENT_EVENTS.ROOM_TIMER);
      socket.off(CLIENT_EVENTS.ROOM_LEADERBOARD);
      socket.off(CLIENT_EVENTS.ROOM_PROMPT);
      socket.off(CLIENT_EVENTS.ROOM_ROUND_REPLAY);
      socket.off(CLIENT_EVENTS.ROOM_ROUND_STANDING);
      socket.off(CLIENT_EVENTS.ROOM_GAME_END);
      socket.off(CLIENT_EVENTS.USER_WAITLIST);
      socket.off(CLIENT_EVENTS.ERROR);
      socket.off(CLIENT_EVENTS.ROOM_KICKED);
      socket.off(CLIENT_EVENTS.USER_PRACTICE_STARTED);
      socket.off(CLIENT_EVENTS.CHAT_BROADCAST);
      socket.off(CLIENT_EVENTS.CHAT_HISTORY);
      socket.off(CLIENT_EVENTS.CHAT_ERROR);

      disconnectSocket();
      reset(); // 소켓 연결 해제 시 전체 상태 초기화
      clearChat(); // 채팅 초기화
    };
  }, [
    roomId,
    nickname,
    profileId,
    navigate,
    setMySocketId,
    setConnected,
    updateRoom,
    setTimer,
    setLiveRankings,
    setPromptStrokes,
    setRoundResults,
    setStandingResults,
    setFinalResults,
    setHighlight,
    setPracticePrompt,
    setIsPracticing,
    setAlertMessage,
    setPendingNavigation,
    reset,
    addToast,
    addChatMessage,
    setChatHistory,
    clearChat,
  ]);

  return getSocket();
};
