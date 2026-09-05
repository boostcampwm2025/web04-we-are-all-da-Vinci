import { installKstDateWatcher } from "@/app/config/kstDateWatcher";
import { queryClient } from "@/app/config/queryClient";
import { router } from "@/app/config/router";
import { initFirebaseAnalyticsOnce } from "@/shared/api";
import {
  captureAttributionOnce,
  getAnonymousHash,
  initTossAdsOnce,
  setObservabilityUser,
} from "@/shared/lib";
import { LandingView } from "@/views/landing";
import { QueryClientProvider } from "@tanstack/react-query";
import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";

const LANDING_SEEN_KEY = "landingSeen";

const App = () => {
  // 랜딩은 세션당 1회만 노출한다 — 세션 스토리지 기반(백그라운드 복귀로 리마운트돼도 재노출 안 함).
  const [hasSeenLanding, setHasSeenLanding] = useState(
    () => sessionStorage.getItem(LANDING_SEEN_KEY) === "1",
  );

  useEffect(() => {
    // 익명 해시를 관측 이벤트의 user id로 쓴다 — 앱인토스 콘솔 anonymous_key와 같은 축.
    getAnonymousHash().then(setObservabilityUser);
    initTossAdsOnce().catch(console.warn);
    initFirebaseAnalyticsOnce()
      .catch(console.warn)
      .finally(() => {
        captureAttributionOnce().catch(console.warn);
      });
  }, []);

  // 백그라운드에서 KST 자정을 넘긴 뒤 돌아오면 "오늘" 리소스를 제자리에서 갱신한다.
  useEffect(() => installKstDateWatcher(queryClient), []);

  const handleLandingStart = () => {
    sessionStorage.setItem(LANDING_SEEN_KEY, "1");
    setHasSeenLanding(true);
  };

  return (
    <TDSMobileAITProvider>
      <QueryClientProvider client={queryClient}>
        {/* 기회 provider·하단바·알림 벨은 토큰이 필요하므로 라우터 안 ProtectedLayout이 마운트한다. */}
        {hasSeenLanding ? (
          <RouterProvider router={router} />
        ) : (
          <LandingView onStart={handleLandingStart} />
        )}
      </QueryClientProvider>
    </TDSMobileAITProvider>
  );
};

export default App;
