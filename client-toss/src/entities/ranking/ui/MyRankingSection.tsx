import { Skeleton } from "@toss/tds-mobile";
import { useMyRanking } from "../hooks/useMyRanking";
import MyRanking from "./MyRanking";
import MyRankingNotSubmitted from "./MyRankingNotSubmitted";

interface MyRankingSectionProps {
  nickname?: string;
}

const MyRankingSection = ({ nickname }: MyRankingSectionProps) => {
  const { isLoading, myRanking } = useMyRanking();

  if (isLoading) {
    return <Skeleton pattern="listOnly" style={{ width: "100%" }} />;
  }

  if (myRanking && myRanking.state === "FOUND") {
    return (
      <MyRanking
        nickname={nickname}
        score={myRanking.ranking.score}
        rank={myRanking.ranking.rank}
      />
    );
  }

  return <MyRankingNotSubmitted />;
};

export default MyRankingSection;
