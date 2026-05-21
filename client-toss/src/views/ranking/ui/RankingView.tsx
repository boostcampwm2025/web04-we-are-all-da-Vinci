import { Podium } from "@/entities/podium";
import { RankingList } from "@/entities/ranking";
import { AD_GROUP_IDS } from "@/shared/config";
import { trackScreen } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { ListHeader } from "@toss/tds-mobile";
import { useEffect } from "react";

const RankingView = () => {
  useEffect(() => {
    trackScreen("ranking_view");
  }, []);

  return (
    <div className="pb-2">
      <div className="px-(--page-px)">
        <Podium />
      </div>

      <div className="px-(--card-mx)">
        <BannerAd adGroupId={AD_GROUP_IDS.BANNER_LIST} />
      </div>

      <div>
        <ListHeader
          title={
            <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
              TOP 100
            </ListHeader.TitleParagraph>
          }
          description={
            <ListHeader.DescriptionParagraph>
              눌러서 상세 정보를 볼 수 있어요
            </ListHeader.DescriptionParagraph>
          }
          descriptionPosition="bottom"
        />
        <RankingList />
      </div>
    </div>
  );
};

export default RankingView;
