import { MyRankingSection, RankingList } from "@/entities/ranking";
import { AD_GROUP_IDS } from "@/shared/config";
import { trackClick } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Border, Button, Top } from "@toss/tds-mobile";
import { Link } from "react-router-dom";

const RankingView = () => {
  return (
    <div
      data-no-safe-area-bottom
      className="flex h-full min-h-0 flex-1 flex-col bg-white"
    >
      <section className="shrink-0">
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
      </section>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <MyRankingSection />
        <BannerAd adGroupId={AD_GROUP_IDS.BANNER_FEED} className="mb-6" />
        <RankingList />
      </main>

      <section className="shrink-0 bg-white px-(--page-px) pt-3 pb-[env(safe-area-inset-bottom)]">
        <Link
          to="/"
          onClick={() => trackClick("ranking_back_to_dashboard_click")}
        >
          <Button
            size="xlarge"
            variant="weak"
            display="block"
            aria-label="대시보드로 돌아가기"
          >
            대시보드로 돌아가기
          </Button>
        </Link>
      </section>
    </div>
  );
};

export default RankingView;
