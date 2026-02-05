import { Skeleton } from '@/shared/ui';

const StandingRowSkeleton = () => (
  <div className="relative flex items-center">
    {/* StandingRow Structure: 
        <div className="flex flex-1 items-center gap-2 rounded-xl border-2 p-1 md:gap-4 md:p-4 bg-white border-gray-200">
    */}
    <div className="flex flex-1 items-center gap-2 rounded-xl border-2 border-gray-200 bg-white p-1 shadow-sm md:gap-4 md:p-4">
      {/* Badge: h-8 w-8 md:h-10 md:w-10 */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 md:h-10 md:w-10">
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>

      {/* Avatar: h-8 w-8 */}
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />

      {/* Nickname: flex-1 truncate text-base md:text-xl */}
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-24 md:h-7" />
      </div>

      {/* Score: text-xl md:text-3xl */}
      <div className="flex items-end gap-1">
        <Skeleton className="h-6 w-16 md:h-8 md:w-24" />
      </div>
    </div>
  </div>
);

export const RoundStandingSkeleton = () => {
  return (
    <>
      <div className="page-center">
        <main className="game-container">
          {/* GameHeader Skeleton (RoundStanding uses showLogo={false}) */}
          <header className="mb-4 flex w-full shrink-0 items-center justify-between px-4 md:px-0">
            {/* Logo area (hidden in RoundStanding) - kept for layout balance */}
            <div className="flex flex-1 items-center justify-start pl-8 opacity-0">
              <Skeleton className="h-12 w-48" />
            </div>

            {/* Center Title */}
            <div className="flex flex-2 flex-col items-center justify-center text-center">
              <div className="mb-2">
                <h1 className="font-handwriting text-4xl font-black text-gray-900 md:text-6xl">
                  현재 순위
                </h1>
              </div>
              <Skeleton className="hidden h-6 w-24 xl:inline" />
            </div>

            {/* Right area spacer */}
            <div className="flex flex-1" />
          </header>

          <div className="mb-4 min-h-14 text-center">
            {/* Rank Message Placeholder */}
          </div>

          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 overflow-hidden p-3 pl-10 md:pl-20">
            {[...Array(5)].map((_, i) => (
              <StandingRowSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    </>
  );
};
