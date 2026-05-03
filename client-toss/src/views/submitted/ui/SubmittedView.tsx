import { serverTossApi } from "@/shared/api";
import { painterMan1Img } from "@/shared/assets/images";
import { useRequiredState } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Score } from "@/shared/ui/score";
import {
  appLogin,
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { BottomCTA } from "@toss/tds-mobile";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const REWARDED_AD_GROUP_ID = "ait-ad-test-rewarded-id";

interface SubmittedRouteState {
  promptId: number;
  strokes: Stroke[];
  similarity: SimilarityResponse | null;
  anonymousHash: string;
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
  const routeState = useRequiredState<SubmittedRouteState>();
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isAdSupported = getAdSupported();

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

  const handleSaveResult = async () => {
    if (!routeState || isSaving) return;
    setIsSaving(true);

    // 게임은 이미 플레이했으므로 API 성공/실패 관계없이 기록
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`lastPlayed_${routeState.anonymousHash}`, today);

    try {
      let userKey = localStorage.getItem("userKey");

      // 비로그인이면 appLogin → accessToken 저장 → getMe로 userKey 획득
      if (!userKey) {
        const { authorizationCode, referrer } = await appLogin();
        const { accessToken } = await serverTossApi.login({
          authorizationCode,
          referrer,
        });
        localStorage.setItem("access_token", accessToken);
        const { userKey: numericKey } = await serverTossApi.getMe();
        userKey = String(numericKey);
        localStorage.setItem("userKey", userKey);
      }

      // 결과 제출
      await serverTossApi.submitDrawing({
        userKey,
        strokes: routeState.strokes,
      });

      const goHome = () => {
        navigate("/", { replace: true });
      };

      // 보상형 광고 표시 후 홈 이동
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
    } catch (error) {
      console.error("결과 저장 실패:", error);
      setIsSaving(false);
      navigate("/", { replace: true });
    }
  };

  if (!routeState) return null;

  const score = routeState.similarity?.score ?? 0;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex flex-1 flex-col items-center px-(--page-px) pt-[20%]">
        <img
          src={painterMan1Img}
          alt=""
          className="mb-6 h-40 w-40 object-contain"
        />
        <h1 className="text-[22px] font-bold">그림을 제출했어요</h1>
        <div className="mt-4">
          <Score value={Math.round(score)} size="l" subtitle="유사도" />
        </div>
        <p className="mt-4 text-sm text-(--color-grey)">
          결과를 저장하고 랭킹을 확인해보세요
        </p>
      </div>

      <div className="px-(--page-px)">
        <BannerAd adGroupId="ait-ad-test-native-image-id" type="list" />
      </div>

      {/* @ts-expect-error TDS BottomCTA.Single children 타입이 framer-motion/React 19 호환 문제로 에러 발생 */}
      <div onClick={handleSaveResult}>
        <BottomCTA.Single loading={isSaving}>결과 저장하기</BottomCTA.Single>
      </div>
    </div>
  );
};

export default SubmittedView;
