import { Podium } from "@/entities/podium";
import { RankingList } from "@/entities/ranking";
import { AD_GROUP_IDS } from "@/shared/config";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Border, ListHeader } from "@toss/tds-mobile";

const RankingView = () => {
  return (
    <div className="pt-4 pb-2">
      <div className="flex w-full flex-col items-center gap-4 px-(--page-px) pb-4">
        <Podium />
      </div>
      <Border variant="full" />
      <div className="px-(--card-mx)">
        <BannerAd adGroupId={AD_GROUP_IDS.BANNER_LIST} className="mt-2 mb-2" />
      </div>
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
  );
};

export default RankingView;
