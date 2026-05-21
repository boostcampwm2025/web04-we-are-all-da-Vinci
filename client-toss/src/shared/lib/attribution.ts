import { getAnonymousHash } from "./getAnonymousHash";
import { trackScreen } from "./analytics";

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

  const hash = await getAnonymousHash();
  const key = buildKey(hash);
  if (localStorage.getItem(key)) return;

  const payload: Attribution = { ...utm, capturedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(payload));
  trackScreen("attribution_first_touch", utm);
};

export const getFirstTouchAttribution =
  async (): Promise<Attribution | null> => {
    const hash = await getAnonymousHash();
    const raw = localStorage.getItem(buildKey(hash));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Attribution;
    } catch {
      return null;
    }
  };
