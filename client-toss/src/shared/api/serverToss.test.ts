import { beforeEach, describe, expect, it, vi } from "vitest";
import { serverTossApi } from "./serverToss";

describe("serverTossApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("내 랭킹 조회 시 /api/rankings/me로 요청하고 공통 헤더를 포함한다", async () => {
    localStorage.setItem("userKey", "123");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        state: "FOUND",
        ranking: { rank: 7, score: 88.5 },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await serverTossApi.getMyRanking();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rankings/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((requestInit.headers as Headers).get("x-user-id")).toBe("1");
  });

  it("랭킹 목록 조회 시 /api/rankings으로 요청하고 공통 헤더를 포함한다", async () => {
    localStorage.setItem("userKey", "123");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    vi.stubGlobal("fetch", fetchMock);

    await serverTossApi.getRankingList();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rankings",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((requestInit.headers as Headers).get("x-user-id")).toBe("1");
  });
  it("내 그림 조회 시 /api/drawing/me로 요청하고 X-User-Id 헤더를 포함한다", async () => {
    localStorage.setItem("userId", "7");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: "7",
        drawings: [],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await serverTossApi.getMyDrawings();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/drawing/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((requestInit.headers as Headers).get("x-user-id")).toBe("7");
  });
});
