import { appLogin } from "@apps-in-toss/web-framework";
import type { Stroke } from "@toss/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { serverTossApi } from "./serverToss";

const { attemptMock, successMock, failureMock } = vi.hoisted(() => ({
  attemptMock: vi.fn(),
  successMock: vi.fn(),
  failureMock: vi.fn(),
}));

vi.mock("@/shared/lib", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib")>()),
  reportAuthLoginAttempt: attemptMock,
  reportAuthLoginSuccess: successMock,
  reportAuthLoginFailure: failureMock,
}));

describe("앱인토스 API 클라이언트", () => {
  const rankingStrokes: Stroke[] = [
    {
      points: [
        [0, 1],
        [0, 1],
      ],
      color: [0, 0, 0],
    },
  ];
  const rankingSimilarity = {
    score: 99.9,
    shapeSimilarity: 50,
    strokeMatchSimilarity: 50,
    penalty: 0,
  };

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
        strokes: rankingStrokes,
        similarity: rankingSimilarity,
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

  it("그림 상세 조회 시 /api/drawing/:drawingId로 요청한다", async () => {
    const body = {
      drawingId: 42,
      nickname: "시드유저A",
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
      nickname: "테스터닉네임",
      gender: null,
      birthday: null,
    };
    const submitBody = {
      drawingId: 42,
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

  it("아카이브 요약 조회 시 /api/archive/summary로 요청한다", async () => {
    const body = {
      dates: [
        {
          date: "2026-05-29",
          drawingCount: 2,
          bestScore: 90,
          rank: 3,
          participantCount: 10,
        },
      ],
      stats: {
        totalDrawingCount: 2,
        playDays: 1,
        bestScore: 90,
        bestRank: 3,
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(body),
      json: async () => body,
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(serverTossApi.getArchiveSummary()).resolves.toEqual(body);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/archive/summary",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );
  });

  it("아카이브 날짜 상세 조회 시 /api/archive/days/:date로 요청한다", async () => {
    const body = {
      date: "2026-05-29",
      prompt: {
        promptId: 1,
        strokes: [],
      },
      ranking: {
        rank: 3,
        score: 90,
        participantCount: 10,
        drawingId: 42,
      },
      drawings: [
        {
          drawingId: 42,
          createdAt: "2026-05-29T01:00:00.000Z",
          strokes: [],
          similarity: {
            score: 90,
            shapeSimilarity: 80,
            strokeMatchSimilarity: 95,
            penalty: 5,
          },
          isRankedDrawing: true,
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(body),
      json: async () => body,
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(serverTossApi.getArchiveDay("2026-05-29")).resolves.toEqual(
      body,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/archive/days/2026-05-29",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );
  });

  describe("401 이후 토큰 재발급 계측", () => {
    const loginBody = { accessToken: "new-token", nickname: "테스터닉네임" };
    const okBody = { state: "NOT_FOUND" };

    const jsonResponse = (body: unknown, ok = true, status = 200) => ({
      ok,
      status,
      text: async () => JSON.stringify(body),
      json: async () => body,
    });

    beforeEach(() => {
      attemptMock.mockClear();
      successMock.mockClear();
      failureMock.mockClear();
      vi.mocked(appLogin).mockResolvedValue({
        authorizationCode: "test-code",
        referrer: "SANDBOX",
      });
    });

    it("재발급에 성공하면 성공 이벤트를 남기고 원래 요청을 재시도한다", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({}, false, 401))
        .mockResolvedValueOnce(jsonResponse(loginBody))
        .mockResolvedValueOnce(jsonResponse(okBody));
      vi.stubGlobal("fetch", fetchMock);

      await serverTossApi.getMyRanking();

      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/oauth/toss/login",
        expect.objectContaining({ method: "POST" }),
      );
      expect(successMock).toHaveBeenCalledTimes(1);
      expect(failureMock).not.toHaveBeenCalled();
      expect(localStorage.getItem("access_token")).toBe("new-token");
    });

    it("토큰이 없던 경우를 최초 로그인으로 기록한다", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({}, false, 401))
        .mockResolvedValueOnce(jsonResponse(loginBody))
        .mockResolvedValueOnce(jsonResponse(okBody));
      vi.stubGlobal("fetch", fetchMock);

      await serverTossApi.getMyRanking();

      expect(attemptMock).toHaveBeenCalledWith(
        expect.objectContaining({ isFirstLogin: true }),
      );
    });

    it("토스 로그인이 실패하면 app_login 단계로 기록하고 에러를 전파한다", async () => {
      vi.mocked(appLogin).mockRejectedValue(new Error("appLogin rejected"));
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({}, false, 401));
      vi.stubGlobal("fetch", fetchMock);

      await expect(serverTossApi.getMyRanking()).rejects.toThrow(
        "appLogin rejected",
      );

      expect(failureMock).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: "app_login",
          isFirstLogin: true,
        }),
      );
      expect(successMock).not.toHaveBeenCalled();
    });

    it("서버가 재발급을 거부하면 token_issue 단계와 상태 코드를 기록한다", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({}, false, 401))
        .mockResolvedValueOnce(jsonResponse({ message: "실패" }, false, 500));
      vi.stubGlobal("fetch", fetchMock);

      await expect(serverTossApi.getMyRanking()).rejects.toThrow(
        "토큰 재발급 실패",
      );

      expect(failureMock).toHaveBeenCalledWith(
        expect.objectContaining({ stage: "token_issue", httpStatus: 500 }),
      );
    });
  });
});
