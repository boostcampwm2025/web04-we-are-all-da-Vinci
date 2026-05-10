import { Skeleton } from "@toss/tds-mobile";
import { useMyRanking } from "../hooks/useMyRanking";
import MyRanking from "./MyRanking";
import MyRankingNotSubmitted from "./MyRankingNotSubmitted";

interface MyRankingSectionProps {
  nickname?: string;
}

const MyRankingSection = ({ nickname }: MyRankingSectionProps) => {
  const { isLoading, myRanking } = useMyRanking();

  return (
    <>
      {isLoading && <Skeleton pattern="listOnly" style={{ width: "100%" }} />}
      {myRanking && myRanking.state === "FOUND" ? (
        <MyRanking
          nickname={nickname}
          score={myRanking.ranking.score}
          rank={myRanking.ranking.rank}
        />
      ) : (
        <MyRankingNotSubmitted />
      )}
    </>
  );
};

export default MyRankingSection;
