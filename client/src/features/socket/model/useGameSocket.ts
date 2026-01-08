import type { FinalResult } from '@/entities/gameResult/model';
import type { GameRoom } from '@/entities/gameRoom/model';
import { useGameStore } from '@/entities/gameRoom/model';
import type { RoundResult } from '@/entities/roundResult/model';
import type { Stroke } from '@/entities/similarity';
import { disconnectSocket, getSocket } from '@/shared/api/socket';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@/shared/config';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const useGameSocket = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // Zustand actions
  const setConnected = useGameStore((state) => state.setConnected);
  const updateRoom = useGameStore((state) => state.updateRoom);
  const setTimer = useGameStore((state) => state.setTimer);
  const setLiveScores = useGameStore((state) => state.setLiveScores);
  const setRoundResults = useGameStore((state) => state.setRoundResults);
  const setFinalResults = useGameStore((state) => state.setFinalResults);
  const setPromptStrokes = useGameStore((state) => state.setPromptStrokes);

  useEffect(() => {
    if (!roomId) {
      console.error('roomId가 없습니다');
      navigate('/');
      return;
    }

    const socket = getSocket();

    // 연결
    socket.connect();

    // 연결 이벤트
    socket.on('connect', () => {
      setConnected(true);

      // 방 입장
      const nickname = localStorage.getItem('nickname');
      if (!nickname) {
        console.error('닉네임이 없습니다');
        navigate('/');
        return;
      }

      socket.emit(SERVER_EVENTS.USER_JOIN, { roomId, nickname });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // 방 정보 업데이트
    socket.on(CLIENT_EVENTS.ROOM_METADATA, (data: GameRoom) => {
      updateRoom({
        roomId: data.roomId,
        players: data.players,
        phase: data.phase,
        currentRound: data.currentRound,
        settings: data.settings,
      });
    });

    // 실시간 데이터
    socket.on(CLIENT_EVENTS.ROOM_TIMER, (time: number) => {
      setTimer(time);
    });

    socket.on(
      CLIENT_EVENTS.ROOM_LEADERBOARD,
      (scores: Record<string, number>) => {
        setLiveScores(scores);
      },
    );

    socket.on(CLIENT_EVENTS.ROOM_PROMPT, (promptStrokes: Stroke[]) => {
      setPromptStrokes(promptStrokes);
    });

    // 결과
    socket.on(CLIENT_EVENTS.ROOM_ROUND_END, (results: RoundResult[]) => {
      setRoundResults(results);
    });

    socket.on(CLIENT_EVENTS.ROOM_GAME_END, (results: FinalResult[]) => {
      setFinalResults(results);
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
    };
  }, [
    roomId,
    navigate,
    setConnected,
    updateRoom,
    setTimer,
    setLiveScores,
    setPromptStrokes,
    setRoundResults,
    setFinalResults,
  ]);

  return getSocket();
};
