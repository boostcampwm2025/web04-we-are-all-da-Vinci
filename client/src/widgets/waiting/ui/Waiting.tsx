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
import { GameHeader } from '@/shared/ui';
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
        <main className="game-container mx-25">
          <GameHeader
            title={TITLES.ROOM}
            description="친구들이 모일 때까지 기다려주세요!"
          />

          <div className="flex min-h-0 flex-1 gap-7">
            <div className="flex h-full flex-1 flex-col gap-4">
              <div className="flex h-full min-h-0 flex-col gap-4">
                <div className="min-h-0 flex-1">
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
          <div
            id="boostAD"
            className="mt-4 flex h-20 w-full shrink-0 justify-center bg-black text-center text-white"
          >
            광고 배너 영역
          </div>
        </main>
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
