import { router } from "@/app/config/router";
import { NotificationBellButton } from "@/feature/notification";
import { PlayChanceProvider } from "@/feature/playChance";
import { initFirebaseAnalyticsOnce } from "@/shared/api";
import { captureAttributionOnce, initTossAdsOnce } from "@/shared/lib";
import { IntroView } from "@/views/intro";
import { LandingView } from "@/views/landing";
import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";

const LANDING_SEEN_KEY = "landingSeen";
const INTRO_SEEN_KEY = "introSeen";

const App = () => {
  const [hasSeenLanding, setHasSeenLanding] = useState(
    () => sessionStorage.getItem(LANDING_SEEN_KEY) === "1",
  );
  const [hasStarted, setHasStarted] = useState(
    () => sessionStorage.getItem(INTRO_SEEN_KEY) === "1",
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

  const handleStart = () => {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    setHasStarted(true);
  };

  return (
    <TDSMobileAITProvider>
      {!hasSeenLanding ? (
        <LandingView onStart={handleLandingStart} />
      ) : hasStarted ? (
        <PlayChanceProvider>
          <RouterProvider router={router} />
          <NotificationBellButton />
        </PlayChanceProvider>
      ) : (
        <IntroView onStart={handleStart} />
      )}
    </TDSMobileAITProvider>
  );
};

export default App;
