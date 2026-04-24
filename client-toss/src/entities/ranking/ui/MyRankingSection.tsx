import { MyRanking } from "./MyRanking";
import { MyRankingNotSubmitted } from "./MyRankingNotSubmitted";
import { useMyRanking } from "../hooks/useMyRanking";
import { Skeleton } from "@toss/tds-mobile";

const MyRankingSection = () => {
  const { isLoading, myRanking } = useMyRanking();

  return (
    <>
      {isLoading && <Skeleton pattern="listOnly" style={{ width: "100%" }} />}
      {myRanking && myRanking.state === "FOUND" ? (
        <MyRanking
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
