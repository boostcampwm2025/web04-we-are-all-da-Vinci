import { MaskedIcon } from "@/shared/ui/maskedIcon";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV_TABS, NAV_VISIBLE_PATHS } from "./config";

/** 하단바 높이 — 콘텐츠 하단 패딩 계산에 재사용 */
export const BOTTOM_NAV_HEIGHT = 48;

interface NavItemButtonProps {
  iconUrl: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}

/**
 * 하단바 항목 버튼(아이콘 + 라벨). 라우트 탭과 공유 같은 액션 항목이 동일 모양을 공유한다.
 * feature 레이어(공유)에서도 재사용한다.
 */
export const NavItemButton = ({
  iconUrl,
  label,
  active = false,
  onClick,
}: NavItemButtonProps) => {
  const color = active ? "var(--color-toss-blue)" : "var(--color-grey)";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="flex h-12 w-full flex-col items-center justify-center gap-0.5"
    >
      <MaskedIcon src={iconUrl} color={color} size={22} />
      <span
        className="text-[11px] font-medium whitespace-nowrap"
        style={{ color }}
      >
        {label}
      </span>
    </button>
  );
};

interface BottomNavProps {
  /** 탭 가운데에 끼우는 슬롯(예: 돌출 테스트 FAB). 한 칸(flex-1)을 차지한다. */
  centerSlot?: ReactNode;
}

/**
 * 게임 화면을 제외한 일반 화면(홈·기록·미션·랭킹)에서만 보이는 하단 네비게이션 바.
 * fixed로 한 번만 렌더되고, 비노출 경로에선 스스로 숨는다.
 * 탭을 좌/우로 나누고 가운데 centerSlot(돌출 FAB)을 끼운다.
 */
const BottomNav = ({ centerSlot }: BottomNavProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!NAV_VISIBLE_PATHS.includes(pathname)) return null;

  const mid = Math.ceil(NAV_TABS.length / 2);
  const leftTabs = NAV_TABS.slice(0, mid);
  const rightTabs = NAV_TABS.slice(mid);

  const renderTab = (tab: (typeof NAV_TABS)[number]) => (
    <li key={tab.id} className="flex-1">
      <NavItemButton
        iconUrl={tab.iconUrl}
        label={tab.label}
        active={pathname === tab.path}
        onClick={() => navigate(tab.path)}
      />
    </li>
  );

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-(--color-card) bg-(--color-page) pb-[calc(env(safe-area-inset-bottom)/2)]"
    >
      <ul className="flex">
        {leftTabs.map(renderTab)}
        {centerSlot && <li className="relative flex-1">{centerSlot}</li>}
        {rightTabs.map(renderTab)}
      </ul>
    </nav>
  );
};

export default BottomNav;
