import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useHasAccessToken } from "../model/useHasAccessToken";

/**
 * 토큰 게이트. 토큰이 없으면 자식을 한 번도 렌더하지 않고 `/login`으로 보낸다.
 * effect에서 이동하면 자식이 먼저 마운트돼 인증 요청이 나가므로 렌더 시점에 분기한다.
 */
const RequireToken = ({ children }: { children: ReactNode }) => {
  const hasToken = useHasAccessToken();

  if (!hasToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default RequireToken;
