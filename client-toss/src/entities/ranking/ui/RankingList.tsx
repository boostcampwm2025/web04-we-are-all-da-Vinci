import { List } from "@toss/tds-mobile";
import { RankingEntry } from "./RankingEntry";

export const RankingList = () => {
  // 임시 데이터: 삭제 필요
  const rankings = new Array(100).fill({}).map((_, index) => ({
    name: `사용자${index}`,
    userId: index,
    drawingId: index,
    rank: index + 1,
    totalSimilarity: 100 - index * 0.75,
  }));
  return (
    <List>
      {rankings.map((ranking) => (
        <RankingEntry
          name={ranking.name}
          rank={ranking.rank}
          totalSimilarity={ranking.totalSimilarity}
          userId={ranking.userId}
          drawingId={ranking.drawingId}
        />
      ))}
    </List>
  );
};
