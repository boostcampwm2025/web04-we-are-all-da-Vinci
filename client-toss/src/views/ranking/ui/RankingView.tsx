import { MyRankingSection, RankingList } from "@/entities/ranking";
import { AD_GROUP_IDS } from "@/shared/config";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Border, Top } from "@toss/tds-mobile";

const RankingView = () => {
  return (
    <div
      data-no-safe-area-bottom
      className="flex min-h-full flex-col items-center pb-[env(safe-area-inset-bottom)]"
    >
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
        <BannerAd adGroupId={AD_GROUP_IDS.BANNER_LIST} className="mb-6" />
        <RankingList />
      </main>
    </div>
  );
};

export default RankingView;
