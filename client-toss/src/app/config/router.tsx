import AnalyticsTracker from "@/app/config/AnalyticsTracker";
import { DashboardView, MyDrawingsPanel } from "@/views/dashboard";
import { QuestView } from "@/views/quest";
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
      {
        element: <DashboardView />,
        children: [
          { index: true, element: <MyDrawingsPanel /> },
          { path: "ranking", element: <RankingView /> },
          { path: "quest", element: <QuestView /> },
        ],
      },
      { path: "/submitted", element: <SubmittedView /> },
      { path: "/drawing/:drawingId", element: <RankingDetailView /> },
    ],
  },
]);
