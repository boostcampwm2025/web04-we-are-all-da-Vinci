import { Drawing } from "@/views/drawing";
import { HomeView } from "@/views/home";
import { Memorize } from "@/views/memorize";
import { SubmittedView } from "@/views/submitted";
import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
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
]);
