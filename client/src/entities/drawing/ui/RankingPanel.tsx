import type { ReactNode } from 'react';

interface RankingPanelProps {
  children: ReactNode;
}

export const RankingPanel = ({ children }: RankingPanelProps) => {
  return (
    <div className="flex w-full flex-col md:w-72">
      <div className="flex h-full flex-col rounded-2xl border-2 border-gray-800 bg-white p-4 shadow-lg">
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h3 className="font-handwriting text-2xl font-bold">실시간 랭킹</h3>
        </div>

        <div className="-m-1 flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto p-1">
          {children}
        </div>
      </div>
    </div>
  );
};
