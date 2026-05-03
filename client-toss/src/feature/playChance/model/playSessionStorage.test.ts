import { describe, expect, it, vi } from "vitest";
import {
  PLAY_SESSION_STORAGE_KEY,
  PLAY_SESSION_TTL_MS,
} from "../config/constants";
import {
  clearPlaySession,
  loadActivePlaySession,
  startPlaySession,
} from "./playSessionStorage";

const makeStorage = (initialValue: string | null = null) => {
  let value = initialValue;

  return {
    getItem: vi.fn(async () => value),
    setItem: vi.fn(async (_key: string, nextValue: string) => {
      value = nextValue;
    }),
    removeItem: vi.fn(async () => {
      value = null;
    }),
    getValue: () => value,
  };
};

const startedAt = new Date("2026-05-03T00:00:00.000Z");

describe("플레이 세션 저장소", () => {
  it("플레이 세션을 시작 시간과 함께 저장한다", async () => {
    const storage = makeStorage();

    const state = await startPlaySession(startedAt, storage);

    expect(state).toEqual({ startedAt: startedAt.getTime() });
    expect(storage.setItem).toHaveBeenCalledWith(
      PLAY_SESSION_STORAGE_KEY,
      JSON.stringify(state),
    );
  });

  it("TTL 안의 세션은 활성 세션으로 반환한다", async () => {
    const storage = makeStorage(
      JSON.stringify({ startedAt: startedAt.getTime() }),
    );

    const session = await loadActivePlaySession(
      new Date(startedAt.getTime() + PLAY_SESSION_TTL_MS - 1),
      storage,
    );

    expect(session).toEqual({ startedAt: startedAt.getTime() });
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("TTL이 지난 세션은 삭제하고 null을 반환한다", async () => {
    const storage = makeStorage(
      JSON.stringify({ startedAt: startedAt.getTime() }),
    );

    const session = await loadActivePlaySession(
      new Date(startedAt.getTime() + PLAY_SESSION_TTL_MS + 1),
      storage,
    );

    expect(session).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(PLAY_SESSION_STORAGE_KEY);
  });

  it("세션을 삭제한다", async () => {
    const storage = makeStorage(
      JSON.stringify({ startedAt: startedAt.getTime() }),
    );

    await clearPlaySession(storage);

    expect(storage.getValue()).toBeNull();
  });
});
