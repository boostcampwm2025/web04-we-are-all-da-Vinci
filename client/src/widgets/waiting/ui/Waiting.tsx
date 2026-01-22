import {
  selectPlayers,
  selectSettings,
  useGameStore,
  useIsHost,
} from '@/entities/gameRoom/model';
import { GameSettingsCard } from '@/entities/gameSettings';
import { PlayerListSection } from '@/features/playerList';
import { RoomCodeCopy } from '@/features/roomCode';
import { RoomSettingsModal, type RoomSettings } from '@/features/roomSettings';
import { WaitingRoomActions } from '@/features/waitingRoomActions';
import { getSocket } from '@/shared/api';
import { MIXPANEL_EVENTS, SERVER_EVENTS, TITLES } from '@/shared/config';
import { trackEvent } from '@/shared/lib/mixpanel';
import { Title } from '@/shared/ui';
import { useState } from 'react';

export const Waiting = () => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Zustand에서 실제 데이터 가져오기
  const roomId = useGameStore((state) => state.roomId);
  const players = useGameStore(selectPlayers);
  const settings = useGameStore(selectSettings);
  const isHostUser = useIsHost();

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(globalThis.location.href);
      trackEvent(MIXPANEL_EVENTS.CLICK_COPYLINK_BTN);
    } catch (e) {
      console.error('클립보드 복사 실패', e);
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

  return (
    <>
      <div className="page-center">
        <div className="page-container">
          <div className="mb-4 shrink-0 text-center">
            <Title title={TITLES.ROOM} fontSize="text-6xl" />
            <p className="font-handwriting text-content-secondary text-2xl">
              친구들이 모일 때까지 기다려주세요!
            </p>
          </div>

          <div className="flex h-fit gap-7">
            <div className="flex h-fit flex-1 flex-col gap-4">
              <div className="h-fit">
                <PlayerListSection
                  players={players}
                  maxPlayer={settings.maxPlayer}
                  roomCode={
                    <RoomCodeCopy roomId={roomId} onCopy={copyRoomId} />
                  }
                />
              </div>
              <div>
                <WaitingRoomActions
                  onStartClick={handleStartGame}
                  isHost={isHostUser}
                  canStart={!!roomId && players.length >= 2}
                />
              </div>
            </div>

            <div className="flex h-full w-80 flex-col gap-4">
              <GameSettingsCard
                settings={settings}
                onEdit={handleSettingsChange}
                isHost={isHostUser}
              />
              <div className="card flex flex-1 items-center justify-center">
                <p className="font-handwriting text-content-disabled text-lg">
                  💬 채팅 (예정)
                </p>
              </div>
            </div>
          </div>
        </div>
        <div
          id="boostAD"
          className="absolute bottom-1 z-1200 flex h-20 w-280 justify-center bg-black px-10 text-center"
        >
          광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고광고
        </div>
      </div>

      <RoomSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onComplete={handleSettingsComplete}
        currentPlayerCount={players.length}
      />
    </>
  );
};
