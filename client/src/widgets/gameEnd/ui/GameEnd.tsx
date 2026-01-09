import type { FinalResult } from '@/entities/gameResult';
import { PodiumPlayer } from '@/entities/gameResult';
import { PATHS, TITLES } from '@/shared/config';
import { CommonBtn, Title } from '@/shared/ui';

const DUMMY_DATA: { totalRounds: number; players: FinalResult[] } = {
  totalRounds: 3,
  players: [
    {
      socketId: 'socket1',
      ranking: 1,
      nickname: 'User 1',
      score: 2400,
      totalScore: 24000,
    },
    {
      socketId: 'socket2',
      ranking: 2,
      nickname: 'Player 2',
      score: 1850,
      totalScore: 18500,
    },
    {
      socketId: 'socket3',
      ranking: 3,
      nickname: 'Player 3',
      score: 1200,
      totalScore: 12000,
    },
    {
      socketId: 'socket4',
      ranking: 4,
      nickname: 'Player 4',
      score: 450,
      totalScore: 4500,
    },
  ],
};

export const GameEnd = () => {
  const topThree = DUMMY_DATA.players.slice(0, 3);

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
                  Total Rounds: {DUMMY_DATA.totalRounds}
                </span>
              </div>

              <div className="flex-1">리플레이를 넣어라</div>
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
                path={PATHS.GAME}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
