import { MyRanking, RankingList } from "@/entities/ranking";
import { Header } from "@/shared/ui/Header";

export const Ranking = () => {
  return (
    <div>
      <Header
        title="오늘의 TOP100"
        subTitle="화살표를 눌러 리플레이를 확인할 수 있어요."
      />
      <MyRanking rank={1010101} totalSimilarity={34.123} />
      <RankingList />
    </div>
  );
};
