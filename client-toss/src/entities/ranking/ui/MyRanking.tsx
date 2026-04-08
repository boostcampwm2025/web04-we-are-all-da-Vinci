interface MyRankingProps {
  rank: number;
  totalSimilarity: number;
}

export const MyRanking = ({ rank, totalSimilarity }: MyRankingProps) => {
  return (
    <div className="h-42 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="text-#03183275 text-xs font-normal">내 등수</div>
        <div className="text-2xl font-medium">{rank}위</div>
        <div className="text-#03183275 text-xs font-normal">
          {totalSimilarity + "점"}
        </div>
      </div>
    </div>
  );
};
