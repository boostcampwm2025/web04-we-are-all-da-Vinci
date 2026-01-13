import type { GameEndResponse } from '@/entities/gameResult/model';
import type { GameRoom } from '@/entities/gameRoom/model';
import { useGameStore } from '@/entities/gameRoom/model';
import type { RankingEntry } from '@/entities/ranking';
import type { RoundEndResponse } from '@/entities/roundResult/model';
import type { Stroke } from '@/entities/similarity';
import { disconnectSocket, getSocket } from '@/shared/api/socket';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@/shared/config';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// 서버에서 오는 랭킹 데이터 타입
interface ServerRankingEntry {
  socketId: string;
  nickname: string;
  similarity: number;
}

export const useGameSocket = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // 닉네임 상태 추적 - localStorage 변경 감지
  const [nickname, setNickname] = useState<string | null>(() =>
    localStorage.getItem('nickname'),
  );

  // Zustand actions
  const setConnected = useGameStore((state) => state.setConnected);
  const updateRoom = useGameStore((state) => state.updateRoom);
  const setTimer = useGameStore((state) => state.setTimer);
  const setLiveRankings = useGameStore((state) => state.setLiveRankings);
  const setRoundResults = useGameStore((state) => state.setRoundResults);
  const setFinalResults = useGameStore((state) => state.setFinalResults);
  const setHighlight = useGameStore((state) => state.setHighlight);
  const setPromptStrokes = useGameStore((state) => state.setPromptStrokes);
  const reset = useGameStore((state) => state.reset);

  // localStorage 변경 감지
  useEffect(() => {
    const checkNickname = () => {
      const storedNickname = localStorage.getItem('nickname');
      setNickname(storedNickname);
    };

    // storage 이벤트 리스너 (다른 탭에서 변경 시)
    window.addEventListener('storage', checkNickname);

    // 같은 탭에서 변경 감지를 위한 interval
    const interval = setInterval(checkNickname, 100);

    return () => {
      window.removeEventListener('storage', checkNickname);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!roomId) {
      console.error('roomId가 없습니다');
      navigate('/');
      return;
    }

    // 닉네임이 없으면 소켓 연결하지 않음
    if (!nickname) {
      console.log('닉네임이 없어서 소켓 연결 대기 중...');
      return;
    }

    const socket = getSocket();

    // 연결
    socket.connect();

    // 연결 이벤트
    socket.on('connect', () => {
      setConnected(true);

      // 방 입장
      socket.emit(SERVER_EVENTS.USER_JOIN, { roomId, nickname });
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
          finalResults: [],
          highlight: null,
          promptStrokes: [],
        });
      }

      updateRoom({
        roomId: data.roomId,
        players: data.players,
        phase: data.phase,
        currentRound: data.currentRound,
        settings: data.settings,
      });
    });

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
    socket.on(CLIENT_EVENTS.ROOM_ROUND_END, (response: RoundEndResponse) => {
      setRoundResults(response.rankings);
      setPromptStrokes(response.promptStrokes);
    });

    socket.on(CLIENT_EVENTS.ROOM_GAME_END, (response: GameEndResponse) => {
      setFinalResults(response.finalRankings);
      setHighlight(response.highlight);
    });

    // 대기열 (DRAWING 중 입장 시)
    socket.on(
      CLIENT_EVENTS.USER_WAITLIST,
      ({ roomId: waitRoomId }: { roomId: string }) => {
        console.log(waitRoomId);
        alert('현재 게임이 진행 중입니다. 다음 라운드부터 참여할 수 있습니다.');
      },
    );

    // 에러
    socket.on(CLIENT_EVENTS.ERROR, (error: { message: string }) => {
      alert(error.message);
      navigate('/');
    });

    // Cleanup
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off(CLIENT_EVENTS.ROOM_METADATA);
      socket.off(CLIENT_EVENTS.ROOM_TIMER);
      socket.off(CLIENT_EVENTS.ROOM_LEADERBOARD);
      socket.off(CLIENT_EVENTS.ROOM_PROMPT);
      socket.off(CLIENT_EVENTS.ROOM_ROUND_END);
      socket.off(CLIENT_EVENTS.ROOM_GAME_END);
      socket.off(CLIENT_EVENTS.USER_WAITLIST);
      socket.off(CLIENT_EVENTS.ERROR);

      disconnectSocket();
      reset(); // 소켓 연결 해제 시 전체 상태 초기화
    };
  }, [
    roomId,
    nickname,
    navigate,
    setConnected,
    updateRoom,
    setTimer,
    setLiveRankings,
    setPromptStrokes,
    setRoundResults,
    setFinalResults,
    setHighlight,
    reset,
  ]);

  return getSocket();
};
