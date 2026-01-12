import { PodiumPlayer } from '@/entities/gameResult';
import { useGameStore } from '@/entities/gameRoom/model';
import { PATHS, TITLES } from '@/shared/config';
import { CommonBtn, Title } from '@/shared/ui';

export const GameEnd = () => {
  const finalResults = useGameStore((state) => state.finalResults);
  const settings = useGameStore((state) => state.settings);
  const highlight = useGameStore((state) => state.highlight);
  const roomId = useGameStore((state) => state.roomId);

  const topThree = finalResults.slice(0, 3);

  return (
    <div className="h-screen">
      <main className="flex h-full flex-col items-center justify-center px-4 py-12">
        <div className="flex w-full flex-col">
          <div className="mb-5 shrink-0 text-center">
            <Title title={TITLES.END} fontSize="text-6xl" />
            <div className="mx-auto mt-1 h-1.5 w-40 rounded-full bg-yellow-300" />
          </div>
        </div>

        <div className="flex h-full w-full max-w-6xl flex-col items-start justify-between lg:flex-row">
          <div className="flex h-full w-full justify-center">
            <div className="flex h-full w-full max-w-lg flex-col rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between border-b border-dashed border-gray-300 pb-2">
                <div className="font-handwriting text-2xl text-gray-800">
                  <span className="material-symbols-outlined mr-1 align-middle text-yellow-500">
                    leaderboard
                  </span>
                  1등 POTG
                </div>
                <span className="text-sm text-gray-500">
                  Total Rounds: {settings.totalRounds}
                </span>
              </div>

              <div className="flex-1">
                {highlight ? (
                  <div className="flex h-full flex-col items-center justify-center">
                    <p className="font-handwriting text-lg text-gray-600">
                      유사도: {highlight.similarity.toFixed(1)}%
                    </p>
                    {/* TODO: DrawingReplay 컴포넌트로 highlight.playerStrokes 리플레이 구현 */}
                  </div>
                ) : (
                  <p className="text-center text-gray-400">리플레이 없음</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-10 pt-4">
            <div className="flex w-full flex-col items-end justify-center gap-6 sm:flex-row">
              {topThree[1] && (
                <PodiumPlayer player={topThree[1]} position="second" />
              )}
              {topThree[0] && (
                <PodiumPlayer player={topThree[0]} position="first" />
              )}
              {topThree[2] && (
                <PodiumPlayer player={topThree[2]} position="third" />
              )}
            </div>

            <div className="flex w-full max-w-md flex-col justify-center gap-4 sm:flex-row">
              <CommonBtn
                variant="radius"
                icon="replay"
                text="다시하기"
                path={`${PATHS.GAME}/${roomId}`}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
