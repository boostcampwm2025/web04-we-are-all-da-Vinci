import { useState } from 'react';
import { useGameStore } from '@/entities/gameRoom';
import type { Player } from '@/entities/player/model';
import { getSocket } from '@/shared/api/socket';
import { SERVER_EVENTS, MIXPANEL_EVENTS } from '@/shared/config';
import { trackEvent } from '@/shared/lib/mixpanel';

interface KickModalConfig {
  isOpen: boolean;
  targetPlayerNickname?: string;
  onConfirm?: () => void;
}

export const useKickModal = () => {
  const socket = getSocket();
  const roomId = useGameStore((state) => state.roomId);

  const [kickModalConfig, setKickModalConfig] = useState<KickModalConfig>({
    isOpen: false,
  });

  const openKickModal = (player: Player) => {
    setKickModalConfig({
      isOpen: true,
      targetPlayerNickname: player.nickname,
      onConfirm: () => {
        trackEvent(MIXPANEL_EVENTS.CLICK_KICK_BTN, {
          targetNickname: player.nickname,
          targetSocketId: player.socketId,
        });
        socket.emit(SERVER_EVENTS.USER_KICK, {
          roomId,
          targetPlayerId: player.socketId,
        });
        setKickModalConfig({ isOpen: false });
      },
    });
  };

  const closeKickModal = () => {
    setKickModalConfig({ isOpen: false });
  };

  return {
    kickModalConfig,
    openKickModal,
    closeKickModal,
  };
};
