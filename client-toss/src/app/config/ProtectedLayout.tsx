import { RequireToken } from "@/feature/login";
import { NotificationBellButton } from "@/feature/notification";
import { PlayChanceProvider, PlayNavButton } from "@/feature/playChance";
import { BottomNav } from "@/shared/ui/bottomNav";
import { useQueryClient } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import { prefetchTab } from "./tabPrefetch";

/**
 * 인증이 필요한 라우트의 공통 레이아웃.
 * `RequireToken`이 토큰 없는 진입을 `/login`으로 돌리므로, 마운트 시 인증 요청을 쏘는
 * `PlayChanceProvider`(/chances/me)와 하단바·알림 벨은 토큰이 보장된 뒤에만 마운트된다.
 * `BottomNav`의 `PlayNavButton`이 `PlayChanceContext`를 쓰므로 반드시 provider 안에 둔다.
 */
const ProtectedLayout = () => {
  const queryClient = useQueryClient();

  return (
    <RequireToken>
      <PlayChanceProvider>
        <Outlet />
        <BottomNav
          centerSlot={<PlayNavButton />}
          onTabIntent={(tab) => prefetchTab(queryClient, tab.path)}
        />
        <NotificationBellButton />
      </PlayChanceProvider>
    </RequireToken>
  );
};

export default ProtectedLayout;
