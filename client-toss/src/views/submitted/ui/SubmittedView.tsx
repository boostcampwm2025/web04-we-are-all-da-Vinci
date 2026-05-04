import { painterMan1Img } from "@/shared/assets/images";
import { trackClick } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Score } from "@/shared/ui/score";
import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import type { SimilarityResponse } from "@toss/shared";
import { BottomCTA, Toast } from "@toss/tds-mobile";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const REWARDED_AD_GROUP_ID = "ait-ad-test-rewarded-id";

interface SubmittedRouteState {
  promotionGranted: boolean;
  similarity: SimilarityResponse | null;
}

const getAdSupported = () => {
  try {
    return loadFullScreenAd.isSupported();
  } catch {
    return false;
  }
};

const SubmittedView = () => {
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state: SubmittedRouteState | null;
  };
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const isAdSupported = getAdSupported();
  const [toastOpen, setToastOpen] = useState(!!state);
  const toastText = state?.promotionGranted
    ? "포인트 지급이 완료됐어요"
    : "그림 제출이 완료됐어요";

  useEffect(() => {
    if (!isAdSupported) return;

    const unregister = loadFullScreenAd({
      options: { adGroupId: REWARDED_AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === "loaded") setIsAdLoaded(true);
      },
      onError: (error) => {
        console.warn("보상형 광고 로드 실패:", error);
      },
    });

    return () => unregister();
  }, [isAdSupported]);

  const handleNavigateHome = () => {
    trackClick("submitted_to_dashboard_click");

    const goHome = () => {
      navigate("/", { replace: true, state: { fromSubmitted: true } });
    };

    if (isAdSupported && isAdLoaded) {
      showFullScreenAd({
        options: { adGroupId: REWARDED_AD_GROUP_ID },
        onEvent: (event) => {
          if (event.type === "dismissed") goHome();
        },
        onError: () => goHome(),
      });
    } else {
      goHome();
    }
  };

  const score = state?.similarity?.score ?? 0;

  return (
    <div className="flex h-full flex-col bg-white">
      <Toast
        position="top"
        open={toastOpen}
        text={toastText}
        leftAddon={<Toast.Icon name="icon-check-circle-blue-opacity" />}
        duration={3000}
        onClose={() => setToastOpen(false)}
      />
      <div className="flex flex-1 flex-col items-center px-(--page-px) pt-[20%]">
        <img
          src={painterMan1Img}
          alt=""
          className="mb-6 h-40 w-40 object-contain"
        />
        <h1 className="text-[22px] font-bold">그림을 제출했어요</h1>
        <div className="mt-4">
          <Score value={Math.round(score)} size="l" />
        </div>
        <p className="mt-4 text-sm text-(--color-grey)">
          결과를 저장하고 랭킹을 확인해보세요
        </p>
      </div>

      <div className="px-(--page-px)">
        <BannerAd adGroupId="ait-ad-test-native-image-id" type="list" />
      </div>

      <div onClick={handleNavigateHome}>
        <BottomCTA.Single>결과 확인하러 가기</BottomCTA.Single>
      </div>
    </div>
  );
};

export default SubmittedView;
