import { RankingCard } from '@/entities/ranking';

export default function FinalResults() {
  const rankings = [
    {
      rank: 1,
      nickname: 'User 1 (You)',
      score: 92,
      color: 'yellow' as const,
    },
    {
      rank: 2,
      nickname: 'Player 2',
      score: 78,
      color: 'indigo' as const,
    },
    {
      rank: 3,
      nickname: 'Player 3',
      score: 45,
      color: 'red' as const,
    },
    {
      rank: 4,
      nickname: 'Player 4',
      score: 0,
      color: 'yellow' as const,
    },
  ];

  const totalRounds = 10;

  return (
    <>
      <div className="flex h-full w-full items-center justify-center px-4 py-4">
        <div className="flex h-full w-full max-w-5xl flex-col">
          <div className="mb-4 shrink-0 text-center">
            <h1 className="font-handwriting mb-2 text-3xl font-black">
              Round Results
            </h1>
            <div className="mx-auto h-1.5 w-48 rounded-full bg-yellow-300" />
          </div>

          <div className="flex min-h-0 flex-1 gap-4">
            <div className="flex flex-1 flex-col">
              <div className="flex h-full flex-col rounded-xl border-2 border-gray-800 bg-white p-3 shadow-lg">
                <div className="mb-2 flex shrink-0 items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base text-blue-600">
                      category
                    </span>
                    <h3 className="font-handwriting text-sm font-bold">
                      Replaying: User 1
                    </h3>
                  </div>
                  <div className="rounded-full bg-yellow-300 px-2 py-0.5 text-xs font-bold text-yellow-900">
                    Best #1
                  </div>
                </div>
                <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-50 p-8"></div>
                <div className="mt-2 shrink-0 text-center">
                  <span className="font-handwriting text-xs text-gray-600">
                    Reference
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col">
              <div className="flex h-full flex-col rounded-xl border-2 border-gray-800 bg-white p-3 shadow-lg">
                <div className="mb-2 flex shrink-0 items-center justify-between">
                  <h3 className="font-handwriting text-sm font-bold">
                    Drawing
                  </h3>
                  <button className="text-gray-600 hover:text-gray-800">
                    <span className="material-symbols-outlined text-base">
                      close
                    </span>
                  </button>
                </div>
                <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-50 p-8"></div>
                <div className="mt-2 shrink-0">
                  <div className="text-center">
                    <span className="font-handwriting text-sm font-bold text-blue-600">
                      유사도: 0%
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: '92%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-72 flex-col gap-3">
              <div className="shrink-0 rounded-xl border-2 border-pink-400 bg-pink-50 p-3 shadow-lg">
                <div className="text-center">
                  <div className="mb-1 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-lg text-pink-600">
                      celebration
                    </span>
                    <h3 className="font-handwriting text-base font-bold">
                      Next Round
                    </h3>
                  </div>
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border-3 border-pink-400 bg-white">
                    <span className="font-handwriting text-3xl font-black text-pink-600">
                      {totalRounds}
                    </span>
                  </div>
                  <p className="font-handwriting mt-1 text-xs text-gray-600">
                    / {totalRounds} rounds
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto rounded-xl border-2 border-gray-800 bg-white p-3 shadow-lg">
                <div className="mb-3 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-base text-yellow-600">
                    emoji_events
                  </span>
                  <h3 className="font-handwriting text-base font-bold">
                    Rankings
                  </h3>
                  <span className="material-symbols-outlined text-base text-yellow-600">
                    emoji_events
                  </span>
                </div>

                <div className="space-y-2">
                  {rankings.map((player) => (
                    <RankingCard
                      key={player.rank}
                      rank={player.rank}
                      nickname={player.nickname}
                      percent={player.score}
                      color={player.color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
