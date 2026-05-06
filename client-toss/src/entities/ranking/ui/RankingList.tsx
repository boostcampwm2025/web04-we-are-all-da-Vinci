import { List, Skeleton } from "@toss/tds-mobile";
import { useRankingList } from "../hooks/useRankingList";
import { RankingEntry } from "./RankingEntry";
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
          nickname={ranking.nickname}
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
