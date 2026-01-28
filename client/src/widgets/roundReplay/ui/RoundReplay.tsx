import { useCurrentPlayer, useGameStore } from '@/entities/gameRoom';
import { PlayerReplaysSection, PromptSection } from '@/entities/roundResult';
import { MySimilarityDetail } from '@/entities/similarity';
import { Timer } from '@/entities/timer';
import { ChatBox, useChatActions, useChatStore } from '@/features/chat';
import { SOUND_LIST } from '@/shared/config/sound';
import { SoundManager } from '@/shared/lib';
import { GameHeader } from '@/shared/ui';
import { useEffect, useMemo } from 'react';

const RoundReplay = () => {
  const roundResults = useGameStore((state) => state.roundResults);
  const currentRound = useGameStore((state) => state.currentRound);
  const promptStrokes = useGameStore((state) => state.promptStrokes);
  const roomId = useGameStore((state) => state.roomId);
  const currentPlayer = useCurrentPlayer();

  // 현재 사용자의 유사도 데이터 추출
  const mySimilarity = useMemo(() => {
    if (!currentPlayer) return null;
    const myResult = roundResults.find(
      (result) => result.socketId === currentPlayer.socketId,
    );
    return myResult?.similarity ?? null;
  }, [roundResults, currentPlayer]);

  // 채팅
  const messages = useChatStore((state) => state.messages);
  const { sendMessage } = useChatActions(roomId);

  useEffect(() => {
    const manager = SoundManager.getInstance();
    manager.playSound(SOUND_LIST.ROUND_END);
  }, []);

  return (
    <>
      <Timer />
      <div className="page-center">
        <main className="game-container">
          <GameHeader title={`라운드 ${currentRound} 결과`} showDecoration />
          <div className="flex min-h-0 flex-1 gap-6">
            {/* 좌측: 제시 그림 + 내 유사도 */}
            <div className="card flex w-72 shrink-0 flex-col gap-4 p-4">
              <PromptSection promptStrokes={promptStrokes} />
              {mySimilarity && <MySimilarityDetail similarity={mySimilarity} />}
            </div>

            {/* 중앙: 플레이어 리플레이 그리드 */}
            <div className="card flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white/50 p-4 shadow-sm ring-1 ring-gray-900/5 backdrop-blur-sm">
              <PlayerReplaysSection players={roundResults} />
            </div>

            {/* 우측: 채팅 */}
            <div className="flex w-72 shrink-0 flex-col">
              <ChatBox
                messages={messages}
                onSendMessage={sendMessage}
                className="h-full"
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
};
export default RoundReplay;
