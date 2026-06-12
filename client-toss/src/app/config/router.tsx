import AnalyticsTracker from "@/app/config/AnalyticsTracker";
import { MissionView } from "@/views/mission";
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
      { path: "/mission", element: <MissionView /> },
    ],
  },
]);
