import { router } from "@/app/config/router";
import { initTossAdsOnce } from "@/shared/lib";
import { IntroView } from "@/views/intro";
import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { useShareButton } from "./feature/shareLink";

const INTRO_SEEN_KEY = "introSeen";

const App = () => {
  const [hasStarted, setHasStarted] = useState(
    () => sessionStorage.getItem(INTRO_SEEN_KEY) === "1",
  );

  useEffect(() => {
    initTossAdsOnce().catch(console.warn);
  }, []);

  useShareButton();

  const handleStart = () => {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    setHasStarted(true);
  };

  return (
    <TDSMobileAITProvider>
      {hasStarted ? (
        <RouterProvider router={router} />
      ) : (
        <IntroView onStart={handleStart} />
      )}
    </TDSMobileAITProvider>
  );
};

export default App;
