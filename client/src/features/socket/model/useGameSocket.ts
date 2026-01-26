import type { GameEndResponse } from '@/entities/gameResult/model';
import type { GameRoom } from '@/entities/gameRoom/model';
import { useGameStore } from '@/entities/gameRoom/model';
import type { Player } from '@/entities/player/model';
import type { RankingEntry } from '@/entities/ranking';
import type {
  RoundReplayResponse,
  RoundStandingResponse,
} from '@/entities/roundResult/model';
import type { Stroke } from '@/entities/similarity';
import type { WaitlistResponse } from '@/features/waitingRoomActions';
import { disconnectSocket, getSocket } from '@/shared/api';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@/shared/config';
import { useToastStore } from '@/shared/model';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// 서버에서 오는 랭킹 데이터 타입
interface ServerRankingEntry {
  socketId: string;
  nickname: string;
  profileId: string;
  similarity: number;
}

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
      setConnected(true);

      // 방 입장
      socket.emit(SERVER_EVENTS.USER_JOIN, { roomId, nickname, profileId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // 방 정보 업데이트
    socket.on(CLIENT_EVENTS.ROOM_METADATA, (data: GameRoom) => {
      const currentPhase = useGameStore.getState().phase;

      // GAME_END에서 WAITING으로 돌아올 때 게임 데이터 초기화
      if (currentPhase === 'GAME_END' && data.phase === 'WAITING') {
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

      const isJoined = data.players.some((p) => p.socketId === socket.id);
      if (isJoined) {
        // 클라이언트가 방에 참여되었다면: 대기상태 해제 후 방 상태 동기화
        setIsInWaitlist(false);
        setIsPracticing(false);
        updateRoom({
          roomId: data.roomId,
          players: data.players,
          phase: data.phase,
          currentRound: data.currentRound,
          settings: data.settings,
        });
      } else {
        // 아직 참여 못한 상태(대기 중)라면 phase는 유지
        updateRoom({
          roomId: data.roomId,
          players: data.players,
          phase: currentPhase,
          currentRound: data.currentRound,
          settings: data.settings,
        });
      }
    });

    // 추방
    socket.on(
      CLIENT_EVENTS.ROOM_KICKED,
      ({ kickedPlayer }: { kickedPlayer: Omit<Player, 'isHost'> }) => {
        const socketId = socket.id;
        if (socketId === kickedPlayer.socketId) {
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

        const newRankings: RankingEntry[] = data.rankings.map(
          (entry, index) => {
            const rank = index + 1;
            const prevEntry = currentRankings.find(
              (r) => r.socketId === entry.socketId,
            );

            return {
              socketId: entry.socketId,
              nickname: entry.nickname,
              profileId: entry.profileId,
              similarity: entry.similarity,
              rank,
              previousRank: prevEntry?.rank ?? null,
            };
          },
        );

        setLiveRankings(newRankings);
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
      ({ roomId, currentRound, totalRounds, phase }: WaitlistResponse) => {
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

      disconnectSocket();
      reset(); // 소켓 연결 해제 시 전체 상태 초기화
    };
  }, [
    roomId,
    nickname,
    profileId,
    navigate,
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
    reset,
    addToast,
  ]);

  return getSocket();
};
