import { Storage } from "@apps-in-toss/web-framework";
import { MAX_PLAY_CHANCE, PLAY_CHANCE_STORAGE_KEY } from "../config/constants";

export interface PlayChanceState {
  date: string;
  count: number;
}

interface NativeStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const clampChance = (count: number) => {
  if (!Number.isFinite(count)) return 0;
  return Math.min(Math.max(Math.floor(count), 0), MAX_PLAY_CHANCE);
};

export const getKstDateKey = (date = new Date()) => {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
};

const makeDefaultState = (date = getKstDateKey()): PlayChanceState => ({
  date,
  count: MAX_PLAY_CHANCE,
});

const parseState = (raw: string | null): PlayChanceState | null => {
  if (raw == null) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PlayChanceState>;
    if (typeof parsed.date !== "string") return null;
    if (typeof parsed.count !== "number") return null;

    return {
      date: parsed.date,
      count: clampChance(parsed.count),
    };
  } catch {
    return null;
  }
};

const writeState = async (
  state: PlayChanceState,
  storage: NativeStorage = Storage,
) => {
  await storage.setItem(PLAY_CHANCE_STORAGE_KEY, JSON.stringify(state));
  return state;
};

export const loadPlayChance = async (
  now = new Date(),
  storage: NativeStorage = Storage,
) => {
  const today = getKstDateKey(now);
  const stored = parseState(await storage.getItem(PLAY_CHANCE_STORAGE_KEY));

  if (stored?.date === today) {
    return stored;
  }

  return await writeState(makeDefaultState(today), storage);
};

export const chargePlayChance = async (
  now = new Date(),
  storage: NativeStorage = Storage,
) => {
  const current = await loadPlayChance(now, storage);
  return await writeState(
    {
      date: current.date,
      count: MAX_PLAY_CHANCE,
    },
    storage,
  );
};

export const consumePlayChance = async (
  now = new Date(),
  storage: NativeStorage = Storage,
) => {
  const current = await loadPlayChance(now, storage);

  if (current.count <= 0) {
    return {
      consumed: false,
      state: current,
    };
  }

  const state = await writeState(
    {
      date: current.date,
      count: current.count - 1,
    },
    storage,
  );

  return {
    consumed: true,
    state,
  };
};
