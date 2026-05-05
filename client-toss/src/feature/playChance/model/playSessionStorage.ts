import { Storage } from "@apps-in-toss/web-framework";
import {
  PLAY_SESSION_STORAGE_KEY,
  PLAY_SESSION_TTL_MS,
} from "../config/constants";

// 비정상 접근 방지: 정상적으로 충전한 기회에 대해서만 접근 부여

export interface PlaySessionState {
  startedAt: number;
}

interface NativeStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const parseSession = (raw: string | null): PlaySessionState | null => {
  if (raw == null) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PlaySessionState>;
    if (typeof parsed.startedAt !== "number") return null;
    if (!Number.isFinite(parsed.startedAt)) return null;

    return { startedAt: parsed.startedAt };
  } catch {
    return null;
  }
};

export const startPlaySession = async (
  now = new Date(),
  storage: NativeStorage = Storage,
) => {
  const state: PlaySessionState = {
    startedAt: now.getTime(),
  };

  await storage.setItem(PLAY_SESSION_STORAGE_KEY, JSON.stringify(state));
  return state;
};

export const clearPlaySession = async (storage: NativeStorage = Storage) => {
  await storage.removeItem(PLAY_SESSION_STORAGE_KEY);
};

export const loadActivePlaySession = async (
  now = new Date(),
  storage: NativeStorage = Storage,
) => {
  const state = parseSession(await storage.getItem(PLAY_SESSION_STORAGE_KEY));
  if (state == null) return null;

  const isExpired = now.getTime() - state.startedAt > PLAY_SESSION_TTL_MS;
  if (isExpired) {
    await clearPlaySession(storage);
    return null;
  }

  return state;
};
