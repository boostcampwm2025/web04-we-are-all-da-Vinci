import { AD_GROUP_IDS } from "@/shared/config";
import { BannerAd } from "@/shared/ui/bannerAd";
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
      {rankingList.flatMap((ranking, idx) => {
        const entry = (
          <RankingEntry
            key={`${ranking.userKey}-${ranking.drawingId}`}
            nickname={ranking.nickname}
            rank={ranking.rank}
            score={ranking.score}
            drawingId={ranking.drawingId}
            isMe={ranking.isMe}
          />
        );
        if ((idx + 1) % 10 !== 0) return [entry];
        return [
          entry,
          <BannerAd
            key={`ad-${idx}`}
            adGroupId={AD_GROUP_IDS.BANNER_LIST}
            className="my-2"
          />,
        ];
      })}
    </List>
  );
};

export default RankingList;
