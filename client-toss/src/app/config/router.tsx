import AnalyticsTracker from "@/app/config/AnalyticsTracker";
import { ArchiveView } from "@/views/archive";
import { DashboardView } from "@/views/dashboard";
import { Drawing } from "@/views/drawing";
import { LoginView } from "@/views/login";
import { Memorize } from "@/views/memorize";
import { RankingView } from "@/views/ranking";
import { RankingDetailView } from "@/views/rankingDetail";
import { SubmittedView } from "@/views/submitted";
import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
  {
    element: <AnalyticsTracker />,
    children: [
      {
        path: "/login",
        element: <LoginView />,
      },
      {
        path: "/memorize",
        element: <Memorize />,
      },
      {
        path: "/drawing",
        element: <Drawing />,
      },
      { index: true, element: <DashboardView /> },
      { path: "/ranking", element: <RankingView /> },
      { path: "/archive", element: <ArchiveView /> },
      { path: "/submitted", element: <SubmittedView /> },
      { path: "/drawing/:drawingId", element: <RankingDetailView /> },
      // TODO(팀원 작업 영역): 미션 화면이 준비되면 element를 <MissionView />로 교체.
      // 경로 `/mission`은 하단바 config(NAV_TABS)와 합의된 값.
      {
        path: "/mission",
        element: (
          <div className="flex h-full items-center justify-center text-(--color-grey)">
            미션 화면은 준비 중이에요
          </div>
        ),
      },
    ],
  },
]);
