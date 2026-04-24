import { List, Skeleton } from "@toss/tds-mobile";
import { RankingEntry } from "./RankingEntry";
import { useRankingList } from "../hooks/useRankingList";

const RankingList = () => {
  const { rankingList, isLoading } = useRankingList();

  return (
    <>
      {isLoading && <Skeleton pattern="listOnly" style={{ width: "100%" }} />}

      {rankingList && (
        <List>
          {rankingList.map((ranking) => (
            <RankingEntry
              key={`${ranking.userId}-${ranking.drawingId}`}
              name={ranking.name}
              rank={ranking.rank}
              score={ranking.score}
              drawingId={ranking.drawingId}
              isMe={ranking.isMe}
            />
          ))}
        </List>
      )}
    </>
  );
};

export default RankingList;
