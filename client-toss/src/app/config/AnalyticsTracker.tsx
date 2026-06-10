import { ShareNavItem } from "@/feature/share";
import { getAnalyticsInstance } from "@/shared/api";
import { FUNNEL_EVENTS } from "@/shared/lib";
import { BottomNav } from "@/shared/ui/bottomNav";
import { logEvent } from "firebase/analytics";
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const fa = getAnalyticsInstance();
    if (!fa) return;
    try {
      logEvent(fa, FUNNEL_EVENTS.pageView, {
        page_path: location.pathname,
        page_title: location.pathname,
      });
    } catch {
      // Firebase 실패는 라우팅 흐름에 영향 주지 않도록 조용히 무시
    }
  }, [location.pathname]);

  return (
    <>
      <Outlet />
      <BottomNav>
        <ShareNavItem />
      </BottomNav>
    </>
  );
};

export default AnalyticsTracker;
