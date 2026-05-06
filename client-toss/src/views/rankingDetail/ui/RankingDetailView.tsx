import { MyScoreCard, useDrawing } from "@/entities/myScoreCard";
import { BannerAd } from "@/shared/ui/bannerAd";
import { colors } from "@toss/tds-colors";
import { Button, Skeleton, Top } from "@toss/tds-mobile";
import { Link, useParams } from "react-router-dom";

const RankingDetailView = () => {
  const { drawingId } = useParams<{ drawingId: string }>();
  const { drawing, isLoading } = useDrawing(drawingId);

  return (
    <div
      data-no-safe-area-bottom
      className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)] bg-white"
    >
      <Top
        title={
          <Top.TitleParagraph>
            {drawing?.drawRanking}위 {drawing?.nickname}의 솜씨
          </Top.TitleParagraph>
        }
      />

      {isLoading ? (
        <div className="px-(--page-px)">
          <Skeleton pattern="listOnly" style={{ width: "100%" }} />
        </div>
      ) : drawing ? (
        <MyScoreCard drawing={drawing} />
      ) : (
        <div className="px-(--page-px)">
          <div
            className="flex h-44 w-full items-center justify-center rounded-2xl text-sm"
            style={{
              backgroundColor: colors.grey100,
              color: colors.grey600,
            }}
          >
            그림을 찾을 수 없어요
          </div>
        </div>
      )}

      <BannerAd adGroupId="ait-ad-test-banner-id" className="mt-3 mb-3" />

      <div className="mt-8 px-(--page-px)">
        <Link to="/ranking">
          <Button size="xlarge" variant="weak" display="block">
            랭킹으로 돌아가기
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default RankingDetailView;
