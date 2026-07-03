import { getAnonymousHash } from "./getAnonymousHash";
import { trackClick, trackScreen } from "./analytics";
import { FUNNEL_EVENTS } from "./funnelEvents";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

type UtmKey = (typeof UTM_KEYS)[number];

export type Attribution = Partial<Record<UtmKey, string>> & {
  capturedAt: number;
};

// 알림 deep link에서 사용하는 utm_source 값. 서버 측 templateSetCode 본문에
// `intoss://we-are-all-da-vinci/?utm_source=daily-prompt&...` 형식으로 박는다.
// FSD상 shared는 feature/notification config를 직접 참조하지 않으므로 슬러그를 여기 두되,
// 알림 타입 추가 시 feature/notification/config의 알림 종류와 동기화해야 한다.
const NOTIFICATION_UTM_SOURCES = new Set([
  "daily-prompt",
  "overtaken",
  "attendance-streak",
]);

const isNotificationSource = (source: string | undefined): boolean =>
  !!source && NOTIFICATION_UTM_SOURCES.has(source);

const readUtmFromUrl = (): Partial<Record<UtmKey, string>> => {
  // 진입 시 utm 쿼리만 읽음(외부 이동·history 조작 아님)
  const search = window.location.search; // qa-ignore
  const params = new URLSearchParams(search);
  const out: Partial<Record<UtmKey, string>> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  return out;
};

const buildKey = (hash: string) => `firstTouch_${hash}`;

export const captureAttributionOnce = async (): Promise<void> => {
  const utm = readUtmFromUrl();
  if (Object.keys(utm).length === 0) return;

  // 알림 deep link 진입은 매번 카운트해서 발송→앱 진입 funnel을 측정한다.
  // firstTouch와 별개로 발화 — 같은 사용자라도 알림 클릭마다 1번씩 잡힘.
  if (isNotificationSource(utm.utm_source)) {
    trackClick(FUNNEL_EVENTS.notificationOpen, utm);
  }

  const hash = await getAnonymousHash();
  const key = buildKey(hash);
  if (localStorage.getItem(key)) return;

  const payload: Attribution = { ...utm, capturedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(payload));
  trackScreen(FUNNEL_EVENTS.attributionFirstTouch, utm);
};
