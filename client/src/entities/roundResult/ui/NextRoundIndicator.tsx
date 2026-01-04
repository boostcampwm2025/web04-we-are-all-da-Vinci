interface NextRoundIndicatorProps {
  currentRound: number;
  totalRounds: number;
}

export function NextRoundIndicator({
  currentRound,
  totalRounds,
}: NextRoundIndicatorProps) {
  return (
    <div className="shrink-0 rounded-xl border-2 border-pink-400 bg-pink-50 p-3 shadow-lg">
      <div className="text-center">
        <div className="mb-1 flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-lg text-pink-600">
            celebration
          </span>
          <h3 className="font-handwriting text-base font-bold">Next Round</h3>
        </div>
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border-3 border-pink-400 bg-white">
          <span className="font-handwriting text-3xl font-black text-pink-600">
            {currentRound}
          </span>
        </div>
        <p className="font-handwriting mt-1 text-xs text-gray-600">
          / {totalRounds} rounds
        </p>
      </div>
    </div>
  );
}
