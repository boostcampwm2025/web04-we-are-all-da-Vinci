const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 ${className}`}
  />
);

export const RoundReplaySkeleton = () => {
  return (
    <>
      <div className="page-center">
        <main className="game-container">
          {/* Header */}
          <header className="mb-4 flex w-full shrink-0 items-center justify-between px-4 md:px-0">
            <div className="flex flex-1" />
            <div className="relative flex flex-2 flex-col items-center justify-center text-center">
              <div className="mb-2 flex items-center gap-2">
                <h1 className="font-handwriting text-4xl font-black text-gray-900 md:text-6xl">
                  라운드
                </h1>
                <h1 className="font-handwriting text-4xl font-black text-gray-900 md:text-6xl">
                  결과
                </h1>
              </div>
              {/* Decoration matching GameHeader */}
              <div className="absolute -top-6 -right-8 hidden rotate-12 md:block">
                <div className="h-16 w-16 animate-pulse rounded-full bg-gray-200 opacity-50" />
              </div>
              <div className="absolute -bottom-4 -left-8 hidden -rotate-12 md:block">
                <div className="h-16 w-16 animate-pulse rounded-full bg-gray-200 opacity-50" />
              </div>
            </div>
            <div className="flex flex-1" />
          </header>

          {/* Main Layout: Left, Center, Right - matches RoundReplay.tsx line 42 */}
          <div className="flex min-h-0 flex-1 flex-col gap-6 md:flex-row">
            {/* 1. Left: Prompt + Similarity matches w-full shrink-0 gap-4 overflow-hidden p-4 md:w-72 md:flex-col */}
            <section className="card flex w-full shrink-0 items-center gap-4 overflow-hidden p-4 md:w-72 md:flex-col md:items-stretch">
              {/* PromptSection Matches PromptSection.tsx */}
              <div className="flex w-full flex-1 flex-col md:flex-none">
                <div className="mb-2 flex shrink-0 items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-gray-300">
                    image
                  </span>
                  <h2 className="font-handwriting text-2xl font-bold text-gray-800">
                    제시된 그림
                  </h2>
                </div>
                {/* Prompt Canvas Container: rounded-xl border-4 border-yellow-300 bg-white p-2 shadow-xl */}
                <div className="flex aspect-square w-full flex-col overflow-hidden rounded-xl border-4 border-yellow-300 bg-white p-2 shadow-xl">
                  <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-50">
                    {/* Static placeholder */}
                  </div>
                </div>
              </div>

              {/* MySimilarityDetail Skeleton */}
              <div className="mt-4 flex w-full flex-1 flex-col gap-2 md:mt-0 md:flex-none">
                <div className="mb-2 flex shrink-0 items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-gray-300">
                    bar_chart
                  </span>
                  <h2 className="font-handwriting text-2xl font-bold text-gray-800">
                    유사도
                  </h2>
                </div>
                <div className="flex h-full min-h-20 w-full flex-col justify-center rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-10" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            </section>

            {/* 2. Center: Player Replays Grid Matches min-h-[500px] flex-1 flex-col overflow-hidden rounded-2xl bg-white/50 p-4 shadow-sm ring-1 ring-gray-900/5 backdrop-blur-sm */}
            <section className="card flex min-h-0 min-h-[500px] flex-1 flex-col overflow-hidden rounded-2xl bg-white/50 p-4 shadow-sm ring-1 ring-gray-900/5 backdrop-blur-sm">
              {/* Grid Header: matches PlayerReplaysSection.tsx */}
              <div className="mb-2 flex shrink-0 items-center justify-between md:justify-start md:gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-indigo-500">
                    replay
                  </span>
                  <h2 className="font-handwriting text-sm font-bold text-gray-800 md:text-xl">
                    플레이어 리플레이
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>

              {/* Grid Content - removed scrolling and dynamic elements */}
              <div className="flex min-h-0 flex-1 flex-wrap items-center justify-center gap-2 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex aspect-[4/3] w-[48%] flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    {/* Header: Avatar + Nickname */}
                    <div className="mb-1 flex items-center gap-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    {/* Replay Canvas - Static */}
                    <div className="w-full flex-1 rounded-lg border border-gray-100 bg-gray-50 p-1"></div>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. Right: ChatBox Matches w-full shrink-0 flex-col md:w-72 */}
            <section className="flex w-full shrink-0 flex-col md:w-72">
              <div className="card flex h-72 h-full flex-col md:h-full">
                {/* Header */}
                <div className="border-stroke-strong border-b-2 px-4 py-3">
                  <div className="flex justify-center">
                    <h3 className="font-handwriting text-lg font-bold text-gray-800">
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
    </>
  );
};
