import { router } from "@/app/config/router";
import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { RouterProvider } from "react-router-dom";
function App() {
  return (
    <TDSMobileAITProvider>
      <RouterProvider router={router} />
    </TDSMobileAITProvider>
  );
}

export default App;
