import { router } from "@/app/config/router";
import { initTossAdsOnce } from "@/shared/lib";
import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { useShareButton } from "./feature/shareLink";
const App = () => {
  useEffect(() => {
    initTossAdsOnce().catch(console.warn);
  }, []);

  useShareButton();

  return (
    <TDSMobileAITProvider>
      <RouterProvider router={router} />
    </TDSMobileAITProvider>
  );
};

export default App;
