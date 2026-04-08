import { Drawing } from "@/views/drawing";
import { HomeView } from "@/views/home";
import { Memorize } from "@/views/memorize";
import { StatusView } from "@/views/status";
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
    element: (
      <StatusView
        title="그림을 제출했어요"
        description={[
          "잠시 후 결과 화면으로 넘어가요",
          "하루 최대 10번 도전할 수 있어요",
        ]}
      />
    ),
  },
]);
