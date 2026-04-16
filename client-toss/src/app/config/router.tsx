import { DashboardView } from "@/views/dashboard";
import { Drawing } from "@/views/drawing";
import { HomeView } from "@/views/home";
import { LoginView } from "@/views/login";
import { Memorize } from "@/views/memorize";
import { SubmittedView } from "@/views/submitted";
import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginView />,
  },
  {
    path: "/",
    element: <HomeView />,
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
    path: "/submitted",
    element: <SubmittedView />,
  },
  {
    path: "/dashboard",
    element: <DashboardView />,
  },
]);
