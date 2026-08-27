import { MaskedIcon } from "@/shared/ui/maskedIcon";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV_TABS, NAV_VISIBLE_PATHS } from "./config";

interface NavItemButtonProps {
  iconUrl: string;
  label: string;
  active?: boolean;
  badge?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}

export const NavItemButton = ({
  iconUrl,
  label,
  active = false,
  badge,
  disabled = false,
  onClick,
}: NavItemButtonProps) => {
  const color = active ? "var(--color-toss-blue)" : "var(--color-grey)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
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
}

const BottomNav = ({ centerSlot }: BottomNavProps) => {
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
