import { MaskedIcon } from "@/shared/ui/maskedIcon";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV_TABS, NAV_VISIBLE_PATHS, type NavTab } from "./config";

interface NavItemButtonProps {
  iconUrl: string;
  label: string;
  active?: boolean;
  badge?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  /** 터치 다운 — 클릭보다 앞서는 "의도" 시점. 프리페치 같은 선행 작업에 쓴다. */
  onPointerDown?: () => void;
}

export const NavItemButton = ({
  iconUrl,
  label,
  active = false,
  badge,
  disabled = false,
  onClick,
  onPointerDown,
}: NavItemButtonProps) => {
  const color = active ? "var(--color-toss-blue)" : "var(--color-grey)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onPointerDown={onPointerDown}
      aria-current={active ? "page" : undefined}
      className="flex h-full w-full flex-col items-center justify-center gap-1"
    >
      <span className="relative flex items-center justify-center">
        <MaskedIcon src={iconUrl} color={color} size={24} />
        {badge}
      </span>
      <span
        className="text-[11px] leading-none font-medium whitespace-nowrap"
        style={{ color }}
      >
        {label}
      </span>
    </button>
  );
};

interface BottomNavProps {
  centerSlot?: ReactNode;
  /** 탭 터치 다운 시 호출 — app 레이어가 목적지 탭의 데이터를 프리페치하는 데 쓴다. */
  onTabIntent?: (tab: NavTab) => void;
}

/**
 * 게임 화면을 제외한 일반 화면(홈·기록·미션·랭킹)에서만 보이는 플로팅 하단 탭바(`.tabbar`).
 * 비노출 경로에선 스스로 숨는다. 탭을 좌/우로 나누고 가운데 centerSlot(테스트 시작)을 끼운다.
 */
const BottomNav = ({ centerSlot, onTabIntent }: BottomNavProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!NAV_VISIBLE_PATHS.includes(pathname)) return null;

  const mid = Math.ceil(NAV_TABS.length / 2);
  const leftTabs = NAV_TABS.slice(0, mid);
  const rightTabs = NAV_TABS.slice(mid);

  const renderTab = (tab: (typeof NAV_TABS)[number]) => (
    <li key={tab.id} className="h-full flex-1">
      <NavItemButton
        iconUrl={tab.iconUrl}
        label={tab.label}
        active={pathname === tab.path}
        onClick={() => navigate(tab.path)}
        onPointerDown={onTabIntent ? () => onTabIntent(tab) : undefined}
      />
    </li>
  );

  return (
    <nav aria-label="주요 메뉴" className="tabbar">
      <ul className="flex h-full items-stretch">
        {leftTabs.map(renderTab)}
        {centerSlot && <li className="h-full flex-1">{centerSlot}</li>}
        {rightTabs.map(renderTab)}
      </ul>
    </nav>
  );
};

export default BottomNav;
