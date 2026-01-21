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
import { getSocket } from '@/shared/api/socket';
import { SERVER_EVENTS, TITLES, MIXPANEL_EVENTS } from '@/shared/config';
import { Title } from '@/shared/ui';
import { useState } from 'react';
import { trackEvent } from '@/shared/lib/mixpanel';

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
      <div className="page-center h-screen">
        <div className="page-container">
          {/* 타이틀 - 전체 화면 중앙 */}
          <div className="mb-4 shrink-0 text-center">
            <Title title={TITLES.ROOM} fontSize="text-6xl" />
            <p className="font-handwriting text-content-secondary text-2xl">
              친구들이 모일 때까지 기다려주세요!
            </p>
          </div>

          {/* 컨텐츠 영역 */}
          <div className="mt-20 flex gap-7">
            {/* 왼쪽: 플레이어 리스트 + 버튼 */}
            <div className="flex flex-1 flex-col gap-4">
              <div>
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

            {/* 오른쪽: 게임 설정 + 채팅 (예정) */}
            <div className="flex w-80 flex-col gap-4">
              <GameSettingsCard
                settings={settings}
                onEdit={handleSettingsChange}
                isHost={isHostUser}
              />
              {/* TODO: 채팅 컴포넌트 */}
              <div className="card flex flex-1 items-center justify-center">
                <p className="font-handwriting text-content-disabled text-lg">
                  💬 채팅 (예정)
                </p>
              </div>
            </div>
          </div>
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
