import { getAnalyticsInstance } from "@/shared/api";
import { FUNNEL_EVENTS, captureWarning } from "@/shared/lib";
import { logEvent } from "firebase/analytics";
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

// page_view 전송 실패는 세션당 1회만 보고 — 한번 깨지면 라우팅마다 반복돼 스팸이 된다.
let pageViewFailureReported = false;

/** 화면 전환 계측만 담당한다. 하단바·기회 provider는 토큰이 필요한 ProtectedLayout이 맡는다. */
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
    } catch (error) {
      // Firebase 실패는 라우팅 흐름을 막지 않되, 실패 사실은 남긴다
      if (pageViewFailureReported) return;
      pageViewFailureReported = true;
      captureWarning("page_view 계측 전송 실패", {
        tags: { error_type: "analytics_send_failed", sdk: "firebase" },
        extra: { pathname: location.pathname, original: String(error) },
      });
    }
  }, [location.pathname]);

  return <Outlet />;
};

export default AnalyticsTracker;
