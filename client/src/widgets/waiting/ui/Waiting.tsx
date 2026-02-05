import {
  selectPlayers,
  selectSettings,
  useGameStore,
  useIsHost,
} from '@/entities/gameRoom';
import { GameSettingsCard } from '@/entities/gameSettings';
import { ChatBox, useChatActions, useChatStore } from '@/features/chat';
import { PlayerListSection } from '@/features/playerList';
import { Practice } from '@/features/practice';
import { RoomCodeCopy } from '@/features/roomCode';
import { RoomSettingsModal } from '@/features/roomSettings';
import {
  WaitingRoomActions,
  WaitingRoomOverlay,
} from '@/features/waitingRoomActions';
import { TITLES, BGM_LIST } from '@/shared/config';
import { useBGM } from '@/shared/model';
import { GameHeader } from '@/shared/ui';
import { useWaitingActions } from '../model/useWaitingActions';

export const Waiting = () => {
  // Zustand에서 실제 데이터 가져오기
  const roomId = useGameStore((state) => state.roomId);
  const players = useGameStore(selectPlayers);
  const settings = useGameStore(selectSettings);
  const isHostUser = useIsHost();
  const isInWaitlist = useGameStore((state) => state.isInWaitlist);
  const isPracticing = useGameStore((state) => state.isPracticing);

  const {
    showSettingsModal,
    setShowSettingsModal,
    copyRoomId,
    handleSettingsChange,
    handleSettingsComplete,
    handleStartGame,
  } = useWaitingActions({ roomId, isHostUser });

  // 채팅
  const messages = useChatStore((state) => state.messages);
  const { sendMessage } = useChatActions(roomId);

  useBGM(BGM_LIST.WAITING);

  return (
    <>
      <div className="page-center">
        <main className="game-container md:mx-10 xl:mx-25">
          <GameHeader
            title={TITLES.ROOM}
            description="친구들이 모일 때까지 기다려주세요!"
          />

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto md:flex-row md:overflow-visible xl:gap-7">
            <section className="flex flex-col gap-4 md:h-full md:flex-1">
              <div className="flex min-h-0 flex-col gap-4 md:h-full">
                <div className="relative min-h-0 md:flex-1">
                  <PlayerListSection
                    players={players}
                    maxPlayer={settings.maxPlayer}
                    roomCode={<RoomCodeCopy onCopy={copyRoomId} />}
                  />
                  {isInWaitlist && <WaitingRoomOverlay />}
                </div>
                <div>
                  <WaitingRoomActions
                    onStartClick={handleStartGame}
                    onSettingsClick={handleSettingsChange}
                    isHost={isHostUser}
                    canStart={!!roomId && players.length >= 2}
                  />
                </div>
              </div>
            </section>

            <section className="flex w-full flex-col gap-4 md:w-50 xl:w-80">
              <div className="hidden md:block">
                <GameSettingsCard
                  settings={settings}
                  onEdit={handleSettingsChange}
                  isHost={isHostUser}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <ChatBox
                  messages={messages}
                  onSendMessage={sendMessage}
                  className="h-72 md:h-full"
                />
              </div>
            </section>
          </div>
          {/* <div
            id="boostAD"
            className="absolute bottom-10 z-40 flex h-25 w-280 justify-center px-10 text-center"
          >
            <div data-boostad-zone className="h-full w-full"></div>
          </div> */}
        </main>
      </div>

      {isPracticing && <Practice />}

      <RoomSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onComplete={handleSettingsComplete}
        currentPlayerCount={players.length}
        settings={settings}
      />
    </>
  );
};
