import type { ReactNode } from 'react';

interface RankingPanelProps {
  children: ReactNode;
}

export function RankingPanel({ children }: RankingPanelProps) {
  return (
    <div className="flex w-72 flex-col">
      <div className="flex h-full flex-col rounded-2xl border-2 border-gray-800 bg-white p-4 shadow-lg">
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h3 className="font-handwriting text-lg font-bold">실시간 랭킹</h3>
          <span className="material-symbols-outlined text-sm text-blue-600">
            sync
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}
