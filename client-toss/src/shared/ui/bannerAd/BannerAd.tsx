import { TossAds } from "@apps-in-toss/web-framework";
import { useEffect, useRef } from "react";
import { initTossAdsOnce } from "@/shared/lib";

interface BannerAdProps {
  adGroupId: string;
}

const BannerAd = ({ adGroupId }: BannerAdProps) => {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let attached: ReturnType<typeof TossAds.attachBanner> | undefined;
    let canceled = false;

    initTossAdsOnce()
      .then(() => {
        if (canceled || !bannerRef.current) return;
        attached = TossAds.attachBanner(adGroupId, bannerRef.current, {
          theme: "light",
          tone: "blackAndWhite",
          variant: "expanded",
        });
      })
      .catch((error) => {
        console.warn("광고 SDK 초기화 실패:", error);
      });

    return () => {
      canceled = true;
      attached?.destroy();
    };
  }, [adGroupId]);

  return <div ref={bannerRef} style={{ width: "100%", height: 96 }} />;
};

export default BannerAd;
