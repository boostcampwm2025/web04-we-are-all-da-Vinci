/**
 * 하단 네비게이션 탭 정의.
 * 아이콘은 토스 정적 아이콘(static.toss.im) SVG를 MaskedIcon으로 색 입혀 사용한다.
 * 채워진 home 변형이 없어 세 아이콘 모두 `-mono`로 통일했다(필요 시 이름만 교체).
 */

const ICON_BASE = "https://static.toss.im/icons/svg";

/** 홈 경로 — 피드형 대시보드(DashboardView)가 인덱스 라우트로 동작한다. */
export const HOME_PATH = "/";

export interface NavTab {
  id: string;
  /** 라벨 — 해요체 불필요한 단어형 */
  label: string;
  path: string;
  iconUrl: string;
}

export const NAV_TABS: NavTab[] = [
  {
    id: "home",
    label: "홈",
    path: HOME_PATH,
    iconUrl: `${ICON_BASE}/icon-home-mono.svg`,
  },
  {
    id: "archive",
    label: "나의 기록",
    path: "/archive",
    iconUrl: `${ICON_BASE}/icon-folder-mono.svg`,
  },
  {
    id: "mission",
    label: "미션",
    path: "/mission",
    iconUrl: `${ICON_BASE}/icon-document-mono.svg`,
  },
  {
    id: "ranking",
    label: "랭킹",
    path: "/ranking",
    iconUrl: `${ICON_BASE}/icon-trophy-mono.svg`,
  },
];

/** 하단바가 노출되는 경로 — 탭 목적지 경로에서 파생 */
export const NAV_VISIBLE_PATHS: string[] = NAV_TABS.map((tab) => tab.path);
