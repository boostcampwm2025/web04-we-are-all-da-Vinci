import AnalyticsTracker from "@/app/config/AnalyticsTracker";
import ProtectedLayout from "@/app/config/ProtectedLayout";
import { MissionView } from "@/views/mission";
import { ArchiveView } from "@/views/archive";
import { DashboardView } from "@/views/dashboard";
import { Drawing } from "@/views/drawing";
import { LoginView } from "@/views/login";
import { Memorize } from "@/views/memorize";
import { RankingView } from "@/views/ranking";
import { RankingDetailView } from "@/views/rankingDetail";
import { SubmittedView } from "@/views/submitted";
import { RouteErrorFallback } from "@/shared/ui/errorBoundary";
import { createBrowserRouter } from "react-router-dom";

// /login만 게이트 밖이다. 나머지는 ProtectedLayout이 토큰 없는 진입을 /login으로 돌린다.
export const router = createBrowserRouter([
  {
    element: <AnalyticsTracker />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        path: "/login",
        element: <LoginView />,
      },
      {
        element: <ProtectedLayout />,
        children: [
          { index: true, element: <DashboardView /> },
          { path: "/memorize", element: <Memorize /> },
          { path: "/drawing", element: <Drawing /> },
          { path: "/ranking", element: <RankingView /> },
          { path: "/archive", element: <ArchiveView /> },
          { path: "/submitted", element: <SubmittedView /> },
          { path: "/drawing/:drawingId", element: <RankingDetailView /> },
          { path: "/mission", element: <MissionView /> },
        ],
      },
    ],
  },
]);
