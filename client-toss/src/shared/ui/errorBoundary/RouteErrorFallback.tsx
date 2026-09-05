import { captureError } from "@/shared/lib";
import { Button } from "@toss/tds-mobile";
import { useEffect } from "react";
import { useNavigate, useRouteError } from "react-router-dom";

/**
 * 라우트 내부 렌더 에러의 폴백. createBrowserRouter는 라우트 에러를 자체 처리해
 * 상위 클래스 경계에 닿지 않으므로, 보고도 여기서 직접 한다.
 */
const RouteErrorFallback = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  useEffect(() => {
    captureError(error, {
      level: "fatal",
      tags: { error_type: "route_error" },
      fingerprint: ["route-error"],
    });
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-(--page-px) text-center">
      <p className="text-lg font-bold">화면을 그리다가 문제가 생겼어요</p>
      <p className="text-sm text-(--color-grey)">잠시 후 다시 시도해 주세요</p>
      <div className="mt-3 flex gap-2">
        <Button variant="weak" onClick={() => navigate(0)}>
          다시 시도
        </Button>
        <Button onClick={() => navigate("/", { replace: true })}>
          홈으로 가기
        </Button>
      </div>
    </div>
  );
};

export default RouteErrorFallback;
