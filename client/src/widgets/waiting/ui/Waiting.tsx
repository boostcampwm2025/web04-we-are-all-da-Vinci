import { GameSettingsCard } from '@/entities/gameSettings';
import { PlayerListSection } from '@/features/playerList';
import { RoomCodeCopy } from '@/features/roomCode';
import { RoomSettingsModal, type RoomSettings } from '@/features/roomSettings';
import { WaitingRoomActions } from '@/features/waitingRoomActions';
import { TITLES } from '@/shared/config';
import { Title } from '@/shared/ui';
import { useState } from 'react';

export const Waiting = () => {
  const [players] = useState([
    { id: 1, nickname: '나(방장)', status: '준비완료', isHost: true },
    { id: 2, nickname: '김그림', status: '대기중', isHost: false },
    { id: 3, nickname: 'ArtMaster', status: '대기중', isHost: false },
    { id: 4, nickname: '낙서왕', status: '대기중', isHost: false },
  ]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    maxPlayers: 8,
    totalRounds: 5,
    drawingTime: 90,
  });

  const roomId = 'ABC-1234';

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('방 코드가 복사되었습니다!');
  };

  const handleSettingsChange = () => {
    setShowSettingsModal(true);
  };

  const handleSettingsComplete = (settings: RoomSettings) => {
    setRoomSettings(settings);
    console.log('Updated room settings:', settings);
    // TODO: 방 설정 업데이트 API 호출
  };

  return (
    <>
      <div className="flex h-full w-full items-center justify-center px-4 py-6">
        <div className="flex w-full max-w-7xl flex-col">
          <div className="mb-5 shrink-0 text-center">
            <Title title={TITLES.ROOM} fontSize="text-6xl" />
            <p className="font-handwriting text-lg text-gray-600">
              친구들이 모일 때까지 기다려주세요!
            </p>
          </div>

          <div className="flex flex-2 gap-7">
            <div className="flex-1">
              <PlayerListSection
                players={players}
                maxPlayers={roomSettings.maxPlayers}
                roomCode={<RoomCodeCopy roomId={roomId} onCopy={copyRoomId} />}
              />
            </div>

            <div className="flex w-96 flex-col justify-center gap-4">
              <GameSettingsCard settings={roomSettings} />
              <WaitingRoomActions onSettingsClick={handleSettingsChange} />
            </div>
          </div>
        </div>
      </div>

      <RoomSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onComplete={handleSettingsComplete}
      />
    </>
  );
};
