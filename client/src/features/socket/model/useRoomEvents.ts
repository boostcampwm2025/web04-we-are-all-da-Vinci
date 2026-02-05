import { useGameStore, type GameRoom } from '@/entities/gameRoom';
import { disconnectSocket, getSocket } from '@/shared/api';
import { CLIENT_EVENTS } from '@/shared/config';
import { useToastStore } from '@/shared/model';
import type { Player } from '@shared/types';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { processRoomMetadata } from '../lib/socketHandlers';

/**
 * 방 메타데이터 및 추방 이벤트 처리 훅
 *
 * ROOM_METADATA: 방 상태 업데이트 (플레이어, 페이즈, 라운드 등)
 * ROOM_KICKED: 추방 처리 (본인이면 홈으로 이동, 타인이면 토스트 표시)
 *
 * @param enabled - 이벤트 리스너 활성화 여부
 */
export const useRoomEvents = (enabled: boolean) => {
  const navigate = useNavigate();
  const updateRoom = useGameStore((state) => state.updateRoom);
  const setIsInWaitlist = useGameStore((state) => state.setIsInWaitlist);
  const setIsPracticing = useGameStore((state) => state.setIsPracticing);
  const reset = useGameStore((state) => state.reset);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const handleRoomMetadata = (data: GameRoom) => {
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
    };

    const handleKicked = ({
      kickedPlayer,
    }: {
      kickedPlayer: Omit<Player, 'isHost'>;
    }) => {
      const mySocketId = useGameStore.getState().mySocketId;
      if (mySocketId === kickedPlayer.socketId) {
        disconnectSocket();
        reset();
        navigate('/');
        addToast(`방에서 퇴장당했습니다.`, 'error');
      } else {
        addToast(`${kickedPlayer.nickname}님이 퇴장당했습니다.`, 'info');
      }
    };

    socket.on(CLIENT_EVENTS.ROOM_METADATA, handleRoomMetadata);
    socket.on(CLIENT_EVENTS.ROOM_KICKED, handleKicked);

    return () => {
      socket.off(CLIENT_EVENTS.ROOM_METADATA, handleRoomMetadata);
      socket.off(CLIENT_EVENTS.ROOM_KICKED, handleKicked);
    };
  }, [
    enabled,
    navigate,
    updateRoom,
    setIsInWaitlist,
    setIsPracticing,
    reset,
    addToast,
  ]);
};
