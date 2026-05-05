import { Drawing } from "@/views/drawing";
import { LoginView } from "@/views/login";
import { Memorize } from "@/views/memorize";
import { SubmittedView } from "@/views/submitted";
import { RankingView } from "@/views/ranking";
import { RankingDetailView } from "@/views/rankingDetail";
import { createBrowserRouter } from "react-router-dom";
import { DashboardView } from "@/views/dashboard";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginView />,
  },
  {
    path: "/",
    element: <DashboardView />,
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
    path: "/drawing/:drawingId",
    element: <RankingDetailView />,
  },
  {
    path: "/submitted",
    element: <SubmittedView />,
  },
  {
    path: "/ranking",
    element: <RankingView />,
  },
]);
