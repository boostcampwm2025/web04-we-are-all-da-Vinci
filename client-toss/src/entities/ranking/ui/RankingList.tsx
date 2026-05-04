import { List, Skeleton } from "@toss/tds-mobile";
import { RankingEntry } from "./RankingEntry";
import { useRankingList } from "../hooks/useRankingList";
import RankingListEmpty from "./RankingListEmpty";

const RankingList = () => {
  const { rankingList, isLoading } = useRankingList();

  if (isLoading) {
    return <Skeleton pattern="listOnly" style={{ width: "100%" }} />;
  }

  if (!rankingList || rankingList.length === 0) {
    return <RankingListEmpty />;
  }

  return (
    <List>
      {rankingList.map((ranking) => (
        <RankingEntry
          key={`${ranking.userKey}-${ranking.drawingId}`}
          name={ranking.name}
          rank={ranking.rank}
          score={ranking.score}
          drawingId={ranking.drawingId}
          isMe={ranking.isMe}
        />
      ))}
    </List>
  );
};

export default RankingList;
