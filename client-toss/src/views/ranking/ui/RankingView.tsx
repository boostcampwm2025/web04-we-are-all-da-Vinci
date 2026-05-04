import { MyRankingSection, RankingList } from "@/entities/ranking";
import { trackClick } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Border, Button, Top } from "@toss/tds-mobile";
import { Link } from "react-router-dom";

const RankingView = () => {
  return (
    <div className="flex min-h-full flex-col items-center">
      <main className="w-full">
        <Top
          title={
            <Top.TitleParagraph role="heading" aria-level={1}>
              오늘의 TOP100
            </Top.TitleParagraph>
          }
          subtitleBottom={
            <Top.SubtitleParagraph role="heading" aria-level={2}>
              화살표를 눌러 리플레이를 확인할 수 있어요.
            </Top.SubtitleParagraph>
          }
        />
        <Border />
        <MyRankingSection />
        <BannerAd adGroupId="ait-ad-test-banner-id" className="mb-6" />
        <RankingList />
        <div className="h-20" />
      </main>

      <footer className="sticky bottom-2 w-[90%] rounded-2xl bg-white">
        <Link
          to="/dashboard"
          onClick={() => trackClick("ranking_back_to_dashboard_click")}
        >
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

export default RankingView;
