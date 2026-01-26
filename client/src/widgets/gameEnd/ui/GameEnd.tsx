import { FinalRankingCard, PotgCard } from '@/entities/gameResult';
import { useGameStore, useIsHost } from '@/entities/gameRoom/model';
import { TIMER } from '@/entities/timer/config';
import { ChatBox, useChatActions, useChatStore } from '@/features/chat';
import { getSocket } from '@/shared/api';
import { SERVER_EVENTS, TITLES } from '@/shared/config';
import { GameHeader } from '@/shared/ui';
import { BGM_LIST } from '@/shared/config/sound';
import { useBGM } from '@/shared/model/useBGM';

const BUTTON_ENABLE_AFTER = 10; // 10초 후 버튼 활성화

export const GameEnd = () => {
  const finalResults = useGameStore((state) => state.finalResults);
  const settings = useGameStore((state) => state.settings);
  const highlight = useGameStore((state) => state.highlight);
  const roomId = useGameStore((state) => state.roomId);
  const timer = useGameStore((state) => state.timer);
  const isHost = useIsHost();

  const topThree = finalResults.slice(0, 3);
  const isButtonEnabled = timer <= TIMER.GAME_END_TIME - BUTTON_ENABLE_AFTER;

  // 채팅
  const messages = useChatStore((state) => state.messages);
  const { sendMessage } = useChatActions(roomId);

  useBGM(BGM_LIST.GAME_END);

  const handleRestart = () => {
    if (!isButtonEnabled) return;
    const socket = getSocket();
    socket.emit(SERVER_EVENTS.ROOM_RESTART, { roomId });
  };

  return (
    <div className="page-center">
      <main className="game-container">
        <GameHeader title={TITLES.END} showDecoration />

        <div className="flex min-h-0 flex-1 gap-6">
          {/* 1. 좌측: POTG 카드 */}
          <section className="flex min-w-0 flex-[1.5] flex-col items-center justify-center">
            <PotgCard
              highlight={highlight}
              totalRounds={settings.totalRounds}
              nickname={topThree[0]?.nickname}
            />
          </section>

          {/* 2. 중앙: 순위 */}
          <section className="flex min-w-0 flex-1 flex-col gap-4">
            <FinalRankingCard
              topThree={topThree}
              timer={timer}
              isHost={isHost}
              isButtonEnabled={isButtonEnabled}
              onRestart={handleRestart}
            />
          </section>

          {/* 3. 우측: 채팅 */}
          <section className="flex w-72 shrink-0 flex-col">
            <ChatBox
              messages={messages}
              onSendMessage={sendMessage}
              className="h-full"
            />
          </section>
        </div>
      </main>
    </div>
  );
};
