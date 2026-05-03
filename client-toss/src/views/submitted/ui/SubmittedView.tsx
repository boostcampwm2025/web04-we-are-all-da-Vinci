import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import { painterMan1Img } from "@/shared/assets/images";
import { BannerAd } from "@/shared/ui/bannerAd";
import { BottomCTA, Toast } from "@toss/tds-mobile";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const REWARDED_AD_GROUP_ID = "ait-ad-test-rewarded-id";

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
    state: { promotionGranted: boolean } | null;
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
        if (event.type === "loaded") {
          setIsAdLoaded(true);
        }
      },
      onError: (error) => {
        console.warn("보상형 광고 로드 실패:", error);
      },
    });

    return () => unregister();
  }, [isAdSupported]);

  const handleNavigateHome = () => {
    if (!isAdSupported || !isAdLoaded) {
      navigate("/");
      return;
    }

    showFullScreenAd({
      options: { adGroupId: REWARDED_AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === "dismissed") {
          navigate("/");
        }
      },
      onError: () => {
        navigate("/");
      },
    });
  };

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
      <div className="flex flex-1 flex-col items-center pt-[30%] px-(--page-px)">
        <img
          src={painterMan1Img}
          alt=""
          className="mb-6 h-40 w-40 object-contain"
        />
        <h1 className="text-[22px] font-bold">그림을 제출했어요</h1>
        <div className="mt-2 text-center">
          <p className="text-sm text-(--color-grey)">
            광고 보고 다시 도전할 수 있어요
          </p>
        </div>
      </div>

      <div className="px-(--page-px)">
        <BannerAd adGroupId="ait-ad-test-native-image-id" type="feed" />
      </div>

      <div onClick={handleNavigateHome}>
        <BottomCTA.Single>결과 확인하러 가기</BottomCTA.Single>
      </div>
    </div>
  );
};

export default SubmittedView;
