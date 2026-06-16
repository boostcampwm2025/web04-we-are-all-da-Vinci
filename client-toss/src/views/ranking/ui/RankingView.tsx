import { RankingList } from "@/entities/ranking";
import { useMissionAction } from "@/shared/hooks";
import { FUNNEL_EVENTS, trackScreen } from "@/shared/lib";
import { Top } from "@toss/tds-mobile";
import { useEffect } from "react";

const RankingView = () => {
  useEffect(() => {
    trackScreen(FUNNEL_EVENTS.rankingView);
  }, []);

  useMissionAction("visit_ranking");

  return (
    <div
      data-no-safe-area-bottom
      className="pb-[calc(env(safe-area-inset-bottom)+72px)]"
    >
      <div>
        <Top
          upperGap={16}
          lowerGap={12}
          title={<Top.TitleParagraph size={28}>TOP 100</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph size={17}>
              눌러서 상세 정보를 볼 수 있어요
            </Top.SubtitleParagraph>
          }
        />
        <RankingList />
      </div>
    </div>
  );
};

export default RankingView;
