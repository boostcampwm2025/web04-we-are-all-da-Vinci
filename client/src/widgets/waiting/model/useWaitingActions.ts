import type { RoomSettings } from '@/features/roomSettings';
import { getSocket } from '@/shared/api';
import { MIXPANEL_EVENTS, SERVER_EVENTS } from '@/shared/config';
import { trackEvent } from '@/shared/lib/mixpanel';
import { useToastStore } from '@/shared/model';
import { useState } from 'react';

interface UseWaitingProps {
  roomId: string;
  isHostUser: boolean;
}

export const useWaitingActions = ({ roomId, isHostUser }: UseWaitingProps) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { addToast } = useToastStore();

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(globalThis.location.href);
      trackEvent(MIXPANEL_EVENTS.CLICK_COPYLINK_BTN);
      addToast('초대 링크가 복사되었습니다!', 'success');
    } catch (e) {
      console.error('클립보드 복사 실패', e);
      addToast('링크 복사에 실패했습니다.', 'error');
    }
  };

  const handleSettingsChange = () => {
    setShowSettingsModal(true);
  };

  const handleSettingsComplete = (settings: RoomSettings) => {
    const socket = getSocket();
    socket.emit(SERVER_EVENTS.ROOM_SETTINGS, {
      roomId,
      maxPlayer: settings.maxPlayers,
      totalRounds: settings.totalRounds,
      drawingTime: settings.drawingTime,
    });
    setShowSettingsModal(false);
  };

  const handleStartGame = () => {
    // 검증: roomId가 없으면 이벤트 발생 방지
    if (!roomId) {
      console.error('Cannot start game: 룸아이디가 있어야 가능');
      return;
    }

    // 검증: 방장이 아니면 게임 시작 불가
    if (!isHostUser) {
      console.error('Cannot start game: 방장만 가능');
      return;
    }

    const socket = getSocket();
    socket.emit(SERVER_EVENTS.ROOM_START, { roomId });
  };

  return {
    showSettingsModal,
    setShowSettingsModal,
    copyRoomId,
    handleSettingsChange,
    handleSettingsComplete,
    handleStartGame,
  };
};
