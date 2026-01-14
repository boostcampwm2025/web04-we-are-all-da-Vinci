import { useState } from 'react';
import { BaseModal } from '@/shared/ui/base-modal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (settings: RoomSettings) => void;
}

export interface RoomSettings {
  maxPlayers: number;
  totalRounds: number;
  drawingTime: number;
}

const RoomSettingsModal = ({
  isOpen,
  onClose,
  onComplete,
}: SettingsModalProps) => {
  const [selectedPlayers, setSelectedPlayers] = useState(4);
  const [selectedRounds, setSelectedRounds] = useState(5);
  const [selectedTime, setSelectedTime] = useState(15);

  const playerOptions = [2, 3, 4, 5, 6, 8, 10, 20, 30];
  const roundOptions = [3, 5, 7, 10];
  const timeOptions = [15, 30, 45, 60];

  const handleComplete = () => {
    if (onComplete) {
      onComplete({
        maxPlayers: selectedPlayers,
        totalRounds: selectedRounds,
        drawingTime: selectedTime,
      });
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="방 설정"
      onConfirm={handleComplete}
      confirmText="완료"
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex w-full items-center justify-between">
            <label className="font-handwriting text-lg font-bold">
              플레이어
            </label>
            <span className="font-handwriting text-sm text-blue-600">
              Player
            </span>
          </div>
          <select
            value={selectedPlayers}
            onChange={(e) => setSelectedPlayers(Number(e.target.value))}
            className="font-handwriting w-full cursor-pointer appearance-none rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-base transition-colors hover:border-gray-400"
          >
            {playerOptions.map((players) => (
              <option key={players} value={players}>
                {players}명
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="font-handwriting text-lg font-bold">
              라운드 수
            </label>
            <span className="font-handwriting text-sm text-blue-600">
              Round
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {roundOptions.map((rounds) => (
              <button
                key={rounds}
                onClick={() => setSelectedRounds(rounds)}
                className={`font-handwriting rounded-lg py-2.5 text-lg font-bold transition-all ${
                  selectedRounds === rounds
                    ? 'border-2 border-blue-500 bg-blue-100 text-blue-700'
                    : 'border-2 border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400'
                }`}
              >
                {rounds}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="font-handwriting text-lg font-bold">
              제한 시간
            </label>
            <span className="font-handwriting text-sm text-blue-600">Time</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {timeOptions.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`font-handwriting rounded-lg py-2.5 text-base font-bold transition-all ${
                  selectedTime === time
                    ? 'border-2 border-blue-500 bg-blue-100 text-blue-700'
                    : 'border-2 border-gray-300 bg-gray-100 text-gray-600 hover:border-gray-400'
                }`}
              >
                {time}s
              </button>
            ))}
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default RoomSettingsModal;
