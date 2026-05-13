import { router } from "@/app/config/router";
import { initTossAdsOnce } from "@/shared/lib";
import { IntroView } from "@/views/intro";
import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { useShareButton } from "./feature/shareLink";

const App = () => {
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    initTossAdsOnce().catch(console.warn);
  }, []);

  useShareButton();

  return (
    <TDSMobileAITProvider>
      {hasStarted ? (
        <RouterProvider router={router} />
      ) : (
        <IntroView onStart={() => setHasStarted(true)} />
      )}
    </TDSMobileAITProvider>
  );
};

export default App;
