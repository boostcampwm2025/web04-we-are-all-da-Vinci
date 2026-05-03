import { TossAds } from "@apps-in-toss/web-framework";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { initTossAdsOnce, trackImpression } from "@/shared/lib";

type BannerType = "list" | "feed";

interface BannerAdProps {
  adGroupId: string;
  type?: BannerType;
  className?: string;
}

const BANNER_HEIGHTS: Record<BannerType, number> = {
  list: 96,
  feed: 410,
};

const MockBanner = ({
  type,
  className,
}: {
  type: BannerType;
  className?: string;
}) => {
  const height = BANNER_HEIGHTS[type];
  return (
    <div
      style={{ height }}
      className={clsx(
        "mx-(--card-mx) mt-2 flex items-center justify-center rounded-2xl bg-gray-100 text-sm text-(--color-grey)",
        className,
      )}
    >
      광고 영역 ({height}px · {type})
    </div>
  );
};

const BannerAd = ({ adGroupId, type = "list", className }: BannerAdProps) => {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [isFailed, setIsFailed] = useState(false);
  const height = BANNER_HEIGHTS[type];

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;

    const adId = adGroupId;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackImpression("banner_ad_impression", { ad_group_id: adId });
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
        if (!canceled) setIsFailed(true);
      });

    return () => {
      canceled = true;
      attached?.destroy();
    };
  }, [adGroupId]);

  if (isFailed) return <MockBanner type={type} className={className} />;

  return (
    <div
      ref={bannerRef}
      style={{ width: "100%", height }}
      className={className}
    />
  );
};

export default BannerAd;
