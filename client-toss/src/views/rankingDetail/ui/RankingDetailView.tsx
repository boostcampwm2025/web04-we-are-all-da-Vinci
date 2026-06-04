import { MyScoreCard, useDrawing } from "@/entities/myScoreCard";
import { PhaseHeader } from "@/entities/phaseHeader";
import { AD_GROUP_IDS } from "@/shared/config";
import { useQuestAction } from "@/shared/hooks/useQuestAction";
import { FUNNEL_EVENTS, trackScreen } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Score } from "@/shared/ui/score";
import { colors } from "@toss/tds-colors";
import { Button, Skeleton } from "@toss/tds-mobile";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

const RankingDetailView = () => {
  const { drawingId } = useParams<{ drawingId: string }>();
  const { drawing, isLoading } = useDrawing(drawingId);
  const location = useLocation();
  const rank = (location.state as { rank?: number } | null)?.rank;

  useEffect(() => {
    trackScreen(
      FUNNEL_EVENTS.rankingDetailView,
      rank != null ? { rank } : undefined,
    );
  }, [rank]);

  useQuestAction("visit_drawing_detail");

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="px-(--page-px)">
          <Skeleton pattern="cardOnly" style={{ width: "100%" }} />
        </div>
      );
    }
    if (drawing) {
      return (
        <>
          <MyScoreCard drawing={drawing} hideHeader hideAd />
          <Score value={Number(drawing.similarity.score.toFixed(2))} size="s" />
          <div className="px-(--card-mx)">
            <BannerAd type="feed" adGroupId={AD_GROUP_IDS.BANNER_FEED} />
          </div>
        </>
      );
    }
    return (
      <div className="px-(--page-px)">
        <div
          className="card flex h-44 w-full items-center justify-center text-sm"
          style={{ color: colors.grey600 }}
        >
          그림을 찾을 수 없어요
        </div>
      </div>
    );
  };

  return (
    <div
      data-no-safe-area-bottom
      className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)] bg-(--color-page)"
    >
      <PhaseHeader
        title={
          drawing
            ? rank
              ? `${rank}위 ${drawing.nickname}의 솜씨`
              : `${drawing.nickname}의 솜씨`
            : "그림 상세"
        }
        description={
          drawing ? (
            <span className="text-(--color-blue)">
              그림을 누르면 자세한 분석을 볼 수 있어요
            </span>
          ) : undefined
        }
      />

      {renderBody()}

      <div className="mt-3 px-(--page-px)">
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
