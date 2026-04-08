import { TossAds } from "@apps-in-toss/web-framework";
import { useEffect, useRef } from "react";

interface BannerAdProps {
  adGroupId: string;
}

const BannerAd = ({ adGroupId }: BannerAdProps) => {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let attached: ReturnType<typeof TossAds.attachBanner> | undefined;

    try {
      TossAds.initialize({
        callbacks: {
          onInitialized: () => {
            if (!bannerRef.current) return;
            attached = TossAds.attachBanner(adGroupId, bannerRef.current, {
              theme: "light",
              tone: "blackAndWhite",
              variant: "expanded",
            });
          },
          onInitializationFailed: (error) => {
            console.warn("광고 SDK 초기화 실패:", error);
          },
        },
      });
    } catch {
      // 네이티브 브릿지 미지원 환경 무시
    }

    return () => {
      attached?.destroy();
    };
  }, [adGroupId]);

  return <div ref={bannerRef} style={{ width: "100%", height: 96 }} />;
};

export default BannerAd;
