import type { ReactNode } from 'react';

interface RankingListProps {
  children: ReactNode;
}

export const RankingList = ({ children }: RankingListProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-xl border-2 border-gray-800 bg-white p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-center gap-1">
        <span className="material-symbols-outlined text-base text-yellow-600">
          emoji_events
        </span>
        <h3 className="font-handwriting text-base font-bold">Rankings</h3>
        <span className="material-symbols-outlined text-base text-yellow-600">
          emoji_events
        </span>
      </div>

      <div className="space-y-2">{children}</div>
    </div>
  );
}
