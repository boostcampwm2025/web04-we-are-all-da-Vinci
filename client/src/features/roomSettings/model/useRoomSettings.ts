import type { Settings } from '@/entities/gameRoom';
import { MIXPANEL_EVENTS } from '@/shared/config';
import { trackEvent } from '@/shared/lib/mixpanel';
import { useState } from 'react';

interface UseRoomSettingsProps {
  settings?: Settings;
  onComplete?: (settings: Settings) => void;
}

export const useRoomSettings = ({
  settings,
  onComplete,
}: UseRoomSettingsProps) => {
  const [prevSettings, setPrevSettings] = useState<Settings | undefined>(
    settings,
  );
  const [selectedPlayers, setSelectedPlayers] = useState(4);
  const [selectedRounds, setSelectedRounds] = useState(5);
  const [selectedTime, setSelectedTime] = useState(15);

  if (settings !== prevSettings) {
    setPrevSettings(settings);
    if (settings) {
      setSelectedPlayers(settings.maxPlayer);
      setSelectedRounds(settings.totalRounds);
      setSelectedTime(settings.drawingTime);
    }
  }

  const handlePlayersChange = (players: number) => {
    setSelectedPlayers(players);
    trackEvent(MIXPANEL_EVENTS.CLICK_SETTINGROOM_PROPERTIES, {
      설정: '플레이어 수',
      값: players,
    });
  };

  const handleRoundsChange = (rounds: number) => {
    setSelectedRounds(rounds);
    trackEvent(MIXPANEL_EVENTS.CLICK_SETTINGROOM_PROPERTIES, {
      설정: '라운드 수',
      값: rounds,
    });
  };

  const handleTimeChange = (time: number) => {
    setSelectedTime(time);
    trackEvent(MIXPANEL_EVENTS.CLICK_SETTINGROOM_PROPERTIES, {
      설정: '그리는 시간',
      값: time,
    });
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete({
        maxPlayer: selectedPlayers,
        totalRounds: selectedRounds,
        drawingTime: selectedTime,
      });
    }
  };

  return {
    selectedPlayers,
    selectedRounds,
    selectedTime,
    handlePlayersChange,
    handleRoundsChange,
    handleTimeChange,
    handleComplete,
  };
};
