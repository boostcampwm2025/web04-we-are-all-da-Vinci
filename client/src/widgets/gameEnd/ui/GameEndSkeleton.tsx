import { TITLES } from '@/shared/config';

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 ${className}`}
  />
);

export const GameEndSkeleton = () => {
  return (
    <div className="page-center">
      <main className="game-container">
        {/* GameHeader with showDecoration */}
        <header className="mb-4 flex w-full shrink-0 items-center justify-between px-4 md:px-0">
          <div className="flex flex-1" />

          <div className="relative flex flex-2 flex-col items-center justify-center text-center">
            <h1 className="font-handwriting text-4xl font-black text-gray-900 md:text-6xl">
              {TITLES.END}
            </h1>
            {/* Decoration Skeleton */}
            <div className="absolute -top-6 -right-8 hidden rotate-12 md:block">
              <div className="h-16 w-16 animate-pulse rounded-full bg-gray-200 opacity-50" />
            </div>
            <div className="absolute -bottom-4 -left-8 hidden -rotate-12 md:block">
              <div className="h-16 w-16 animate-pulse rounded-full bg-gray-200 opacity-50" />
            </div>
          </div>

          <div className="flex flex-1" />
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:gap-6">
          {/* 1. Left: POTG Card Skeleton (Matches PotgCard.tsx structure) */}
          <section className="flex min-w-0 flex-[1.5] flex-col items-center justify-center">
            {/* card flex h-full w-full flex-col overflow-hidden p-4 */}
            <div className="card font-handwriting paper-shadow flex h-full w-full flex-col overflow-hidden p-4">
              {/* Header: px-6 py-3 border-b border-dashed */}
              <div className="mb-2 flex shrink-0 items-center justify-between border-b border-dashed border-gray-300 px-6 py-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-6 w-40" />
                </div>
                <Skeleton className="h-5 w-24" />
              </div>

              {/* Similarity Score */}
              <div className="mt-8 flex justify-center pb-2">
                <Skeleton className="h-8 w-48" />
              </div>

              {/* Images Area */}
              <div className="flex min-h-0 flex-1 flex-col items-center gap-2">
                <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-4 py-2 lg:gap-8">
                  {/* Left Image */}
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <Skeleton className="h-6 w-24" />
                    <div className="aspect-square w-full rounded-2xl border-4 border-gray-200 bg-gray-50 p-4 shadow-md">
                      <Skeleton className="h-full w-full rounded-lg" />
                    </div>
                  </div>
                  {/* Right Image */}
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <Skeleton className="h-6 w-24" />
                    <div className="aspect-square w-full rounded-2xl border-4 border-yellow-400 bg-gray-50 p-4 shadow-xl">
                      <Skeleton className="h-full w-full rounded-lg" />
                    </div>
                  </div>
                </div>

                {/* Nickname Footer */}
                <div className="flex flex-col items-center gap-2 pb-4">
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
            </div>
          </section>

          {/* 2. Center: Ranking/Podium Skeleton (Matches FinalRankingCard.tsx) */}
          <section className="flex min-w-0 flex-1 flex-col gap-4 md:flex-row">
            {/* card relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-6 */}
            <div className="card relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-6">
              <div className="relative z-10 mb-4 text-center">
                <h2 className="font-handwriting text-4xl text-gray-900">
                  최종 순위
                </h2>
              </div>

              <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-8">
                {/* Podium */}
                <div className="flex w-full items-end justify-center px-2">
                  {/* 2nd */}
                  <div className="flex flex-col items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-full border-2 border-white" />
                    <div className="h-24 w-16 rounded-t-lg border-x-2 border-t-2 border-gray-300 bg-gray-200" />
                  </div>
                  {/* 1st */}
                  <div className="mx-2 flex flex-col items-center gap-2">
                    <Skeleton className="h-14 w-14 rounded-full border-4 border-yellow-400" />
                    <div className="h-32 w-20 rounded-t-lg border-x-2 border-t-2 border-yellow-400 bg-yellow-200" />
                  </div>
                  {/* 3rd */}
                  <div className="flex flex-col items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-full border-2 border-white" />
                    <div className="h-16 w-16 rounded-t-lg border-x-2 border-t-2 border-gray-300 bg-gray-200" />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex w-full flex-col items-center gap-3">
                  <Skeleton className="h-12 w-full rounded-full" />
                  <Skeleton className="h-6 w-48" />
                </div>
              </div>
            </div>
          </section>

          {/* 3. Right: Chat Box Skeleton */}
          <section className="flex w-full shrink-0 flex-col md:w-72">
            <div className="card flex h-72 h-full flex-col md:h-full">
              {/* Header */}
              <div className="border-stroke-strong border-b-2 px-4 py-3">
                <div className="flex justify-center">
                  <h3 className="font-handwriting text-lg font-bold text-gray-400">
                    채팅
                  </h3>
                </div>
              </div>
              {/* Messages */}
              <div className="relative flex-1 p-4">
                <div className="flex h-full flex-col justify-end gap-2">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <Skeleton className="h-8 w-5/6 self-end rounded-lg" />
                </div>
              </div>
              {/* Input */}
              <div className="rounded-b-xl border-t-2 border-gray-200 bg-white p-2">
                <Skeleton className="h-8 w-full rounded-full" />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
