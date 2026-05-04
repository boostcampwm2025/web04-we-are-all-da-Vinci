import { describe, expect, it, vi } from "vitest";
import {
  chargePlayChance,
  consumePlayChance,
  getKstDateKey,
  loadPlayChance,
} from "./playChanceStorage";
import { MAX_PLAY_CHANCE, PLAY_CHANCE_STORAGE_KEY } from "../config/constants";

const makeStorage = (initialValue: string | null = null) => {
  let value = initialValue;

  return {
    getItem: vi.fn(async () => value),
    setItem: vi.fn(async (_key: string, nextValue: string) => {
      value = nextValue;
    }),
    getValue: () => value,
  };
};

const kstMorning = new Date("2026-05-02T15:30:00.000Z");

describe("플레이 기회 저장소", () => {
  it("한국 시간 기준 날짜 키를 만든다", () => {
    expect(getKstDateKey(kstMorning)).toBe("2026-05-03");
  });

  it("저장된 값이 없으면 오늘 기본 기회 1회를 저장하고 반환한다", async () => {
    const storage = makeStorage();

    const state = await loadPlayChance(kstMorning, storage);

    expect(state).toEqual({ date: "2026-05-03", count: MAX_PLAY_CHANCE });
    expect(storage.setItem).toHaveBeenCalledWith(
      PLAY_CHANCE_STORAGE_KEY,
      JSON.stringify(state),
    );
  });

  it("저장된 날짜가 오늘이면 기존 기회를 반환한다", async () => {
    const stored = { date: "2026-05-03", count: 0 };
    const storage = makeStorage(JSON.stringify(stored));

    const state = await loadPlayChance(kstMorning, storage);

    expect(state).toEqual(stored);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("저장된 날짜가 오늘이 아니면 기본 기회 1회로 갱신한다", async () => {
    const storage = makeStorage(
      JSON.stringify({ date: "2026-05-02", count: 0 }),
    );

    const state = await loadPlayChance(kstMorning, storage);

    expect(state).toEqual({ date: "2026-05-03", count: MAX_PLAY_CHANCE });
  });

  it("기회를 충전해도 최대 1회까지만 보유한다", async () => {
    const storage = makeStorage(
      JSON.stringify({ date: "2026-05-03", count: 0 }),
    );

    const state = await chargePlayChance(kstMorning, storage);

    expect(state).toEqual({ date: "2026-05-03", count: MAX_PLAY_CHANCE });
  });

  it("기회가 있으면 1회를 차감한다", async () => {
    const storage = makeStorage(
      JSON.stringify({ date: "2026-05-03", count: 1 }),
    );

    const result = await consumePlayChance(kstMorning, storage);

    expect(result).toEqual({
      consumed: true,
      state: { date: "2026-05-03", count: 0 },
    });
  });

  it("기회가 없으면 차감하지 않는다", async () => {
    const storage = makeStorage(
      JSON.stringify({ date: "2026-05-03", count: 0 }),
    );

    const result = await consumePlayChance(kstMorning, storage);

    expect(result).toEqual({
      consumed: false,
      state: { date: "2026-05-03", count: 0 },
    });
  });
});
