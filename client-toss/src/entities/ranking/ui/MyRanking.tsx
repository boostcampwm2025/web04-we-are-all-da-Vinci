interface MyRankingProps {
  rank: number;
  score: number;
}

export const MyRanking = ({ rank, score }: MyRankingProps) => {
  return (
    <div className="h-42 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="text-#03183275 text-xs font-[400]">내 등수</div>
        <div className="text-4xl font-[700]">
          {rank}
          <span className="text-2xl font-[400]">위</span>
        </div>
        <div className="text-#03183275 text-xs font-[400]">{score + "점"}</div>
      </div>
    </div>
  );
};
