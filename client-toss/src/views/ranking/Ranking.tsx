import { MyRanking, RankingList } from "@/entities/ranking";
import { Header } from "@/shared/ui/Header";
import { Border, Button } from "@toss/tds-mobile";
import { Link } from "react-router-dom";

export const Ranking = () => {
  return (
    <div className="flex flex-col items-center  justify-center">
      <main className="w-full">
        <Header
          title="오늘의 TOP100"
          subTitle="화살표를 눌러 리플레이를 확인할 수 있어요."
        />
        <Border />
        <MyRanking rank={1010101} totalSimilarity={34.123} />
        <RankingList />
      </main>

      <footer className="fixed bottom-2 w-[90%] bg-white rounded-2xl">
        <Link to="/dashboard">
          <Button
            size="xlarge"
            variant="weak"
            display="block"
            aria-label="결과 화면으로 돌아가기"
          >
            결과 화면으로 돌아가기
          </Button>
        </Link>
      </footer>
    </div>
  );
};
