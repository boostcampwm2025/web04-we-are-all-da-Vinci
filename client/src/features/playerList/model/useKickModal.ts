import { useState } from 'react';
import { useGameStore } from '@/entities/gameRoom';
import type { Player } from '@/entities/player/model';
import { getSocket } from '@/shared/api/socket';
import { SERVER_EVENTS } from '@/shared/config';

interface KickModalConfig {
  isOpen: boolean;
  targetPlayerNickname?: string;
  onConfirm?: () => void;
}

export const useKickModal = () => {
  const socket = getSocket();
  const roomId = useGameStore((state) => state.roomId);

  // 킥 확인 모달 상태
  const [kickModalConfig, setKickModalConfig] = useState<KickModalConfig>({
    isOpen: false,
  });

  // 킥 모달 열기 (확인 시 서버에 킥 요청)
  const openKickModal = (player: Player) => {
    setKickModalConfig({
      isOpen: true,
      targetPlayerNickname: player.nickname,
      onConfirm: () => {
        socket.emit(SERVER_EVENTS.USER_KICK, {
          roomId,
          targetPlayerId: player.socketId,
        });
        setKickModalConfig({ isOpen: false });
      },
    });
  };

  // 킥 모달 닫기
  const closeKickModal = () => {
    setKickModalConfig({ isOpen: false });
  };

  return {
    kickModalConfig,
    openKickModal,
    closeKickModal,
  };
};
