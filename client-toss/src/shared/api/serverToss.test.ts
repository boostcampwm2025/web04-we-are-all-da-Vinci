import type { Stroke } from "@toss/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { serverTossApi } from "./serverToss";

describe("serverTossApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("내 랭킹 조회 시 /api/rankings/me로 요청하고 x-user-id를 보내지 않는다", async () => {
    const body = { state: "FOUND", ranking: { rank: 7, score: 88.5 } };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(body),
      json: async () => body,
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
    expect((requestInit.headers as Headers).get("x-user-id")).toBeNull();
  });

  it("랭킹 목록 조회 시 /api/rankings로 요청하고 rankings만 반환한다", async () => {
    const rankings = [
      {
        userKey: 123,
        nickname: "김다빈치",
        drawingId: "100",
        rank: 1,
        score: 99.9,
        isMe: true,
      },
    ];
    const body = {
      updatedAt: "2026-05-02T00:00:00.000Z",
      rankings,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => body,
      text: async () => JSON.stringify(body),
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(serverTossApi.getRankingList()).resolves.toEqual(rankings);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rankings",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((requestInit.headers as Headers).get("x-user-id")).toBeNull();
  });

  it("내 그림 조회 시 /api/drawing/me로 요청하고 x-user-id를 보내지 않는다", async () => {
    const body = { userKey: 7, drawings: [] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(body),
      json: async () => body,
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
    expect((requestInit.headers as Headers).get("x-user-id")).toBeNull();
  });

  it("그림 상세 조회 시 /api/drawing/:drawingId로 요청한다", async () => {
    const body = {
      drawingId: 42,
      nickname: "시드유저A",
      drawRanking: 1,
      strokes: [],
      similarity: {
        score: 90,
        shapeSimilarity: 45,
        strokeMatchSimilarity: 45,
        penalty: 0,
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(body),
      json: async () => body,
    });

    vi.stubGlobal("fetch", fetchMock);

    await serverTossApi.getDrawing("42");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/drawing/42",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );
  });

  it("그림 제출 시 /api/drawing으로 userKey와 strokes를 전송한다", async () => {
    localStorage.setItem("userKey", "1234");
    const body = {
      drawingId: 42,
      promotionGranted: true,
      similarity: {
        score: 90,
        shapeSimilarity: 45,
        strokeMatchSimilarity: 45,
        penalty: 0,
      },
    };
    const strokes: Stroke[] = [
      {
        points: [
          [0, 1],
          [0, 1],
        ],
        color: [0, 0, 0],
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(body),
      json: async () => body,
    });

    vi.stubGlobal("fetch", fetchMock);

    await serverTossApi.submitDrawing(strokes);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/drawing",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userKey: "1234", strokes }),
      }),
    );
  });

  it("저장된 userKey가 없으면 /user/me에서 null 생일을 허용하고 userKey를 가져와 제출한다", async () => {
    const userInfo = {
      userKey: 760442640,
      name: "Tester",
      nickname: "테스터닉",
      gender: null,
      birthday: null,
    };
    const submitBody = {
      drawingId: 42,
      promotionGranted: false,
      similarity: {
        score: 90,
        shapeSimilarity: 45,
        strokeMatchSimilarity: 45,
        penalty: 0,
      },
    };
    const strokes: Stroke[] = [
      {
        points: [
          [0, 1],
          [0, 1],
        ],
        color: [0, 0, 0],
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(userInfo),
        json: async () => userInfo,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(submitBody),
        json: async () => submitBody,
      });

    vi.stubGlobal("fetch", fetchMock);

    await serverTossApi.submitDrawing(strokes);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/user/me",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/drawing",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userKey: "760442640", strokes }),
      }),
    );
    expect(localStorage.getItem("userKey")).toBe("760442640");
  });
});
