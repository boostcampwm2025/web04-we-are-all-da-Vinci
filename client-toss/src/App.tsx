import { router } from "@/app/config/router";
import { NotificationBellButton } from "@/feature/notification";
import { PlayChanceProvider } from "@/feature/playChance";
import { initFirebaseAnalyticsOnce } from "@/shared/api";
import { captureAttributionOnce, initTossAdsOnce } from "@/shared/lib";
import { LandingView } from "@/views/landing";
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
    initTossAdsOnce().catch(console.warn);
    initFirebaseAnalyticsOnce()
      .catch(console.warn)
      .finally(() => {
        captureAttributionOnce().catch(console.warn);
      });
  }, []);

  const handleLandingStart = () => {
    sessionStorage.setItem(LANDING_SEEN_KEY, "1");
    setHasSeenLanding(true);
  };

  return (
    <TDSMobileAITProvider>
      {hasSeenLanding ? (
        <PlayChanceProvider>
          <RouterProvider router={router} />
          <NotificationBellButton />
        </PlayChanceProvider>
      ) : (
        <LandingView onStart={handleLandingStart} />
      )}
    </TDSMobileAITProvider>
  );
};

export default App;
