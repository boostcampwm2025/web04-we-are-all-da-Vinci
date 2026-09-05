import { serverTossApi } from "@/shared/api";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { missionQueries } from "./missionQueries";

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    getTodayMissions: vi.fn(),
    getMyMissions: vi.fn(),
    assignMyMissions: vi.fn(),
  },
}));

const api = serverTossApi as unknown as {
  getTodayMissions: Mock;
  getMyMissions: Mock;
  assignMyMissions: Mock;
};

const emptyMine = {
  dailyMissions: [],
  weeklyMissions: [],
  tutorialCategories: [],
  challengeMissions: [],
};

describe("미션 쿼리 정의", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T15:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("오늘·전체 미션 키에 KST 날짜가 들어가고 둘 다 영속 대상이다", () => {
    expect(missionQueries.today().queryKey).toEqual([
      "missions",
      "today",
      "2026-05-04",
    ]);
    expect(missionQueries.mine().queryKey).toEqual([
      "missions",
      "me",
      "2026-05-04",
    ]);
    expect(missionQueries.today().meta?.persist).toBe(true);
    expect(missionQueries.mine().meta?.persist).toBe(true);
  });

  it("오늘 미션이 비어 있으면 배정 후 재조회한다 — 배정 POST에는 취소 signal을 넘기지 않는다", async () => {
    const signal = new AbortController().signal;
    api.getTodayMissions
      .mockResolvedValueOnce({ missions: [] })
      .mockResolvedValueOnce({ missions: [{ id: 1 }] });
    api.assignMyMissions.mockResolvedValue(emptyMine);

    const result = await missionQueries.today().queryFn!({
      signal,
      queryKey: missionQueries.today().queryKey,
      client: {} as never,
      meta: undefined,
    });

    expect(result).toEqual({ missions: [{ id: 1 }] });
    expect(api.getTodayMissions).toHaveBeenCalledWith({ signal });
    expect(api.assignMyMissions).toHaveBeenCalledWith();
  });

  it("전체 미션이 모두 비어 있으면 배정 응답을 그대로 쓴다", async () => {
    const assigned = { ...emptyMine, dailyMissions: [{ id: 7 }] };
    api.getMyMissions.mockResolvedValue(emptyMine);
    api.assignMyMissions.mockResolvedValue(assigned);

    const result = await missionQueries.mine().queryFn!({
      signal: new AbortController().signal,
      queryKey: missionQueries.mine().queryKey,
      client: {} as never,
      meta: undefined,
    });

    expect(result).toBe(assigned);
    expect(api.assignMyMissions).toHaveBeenCalledWith();
  });
});
