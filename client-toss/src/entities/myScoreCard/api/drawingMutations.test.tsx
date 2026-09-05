import { serverTossApi } from "@/shared/api";
import { createTestQueryClient, withQueryClient } from "@/shared/testing";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { useSubmitDrawing } from "./drawingMutations";

vi.mock("@/shared/api", () => ({
  serverTossApi: { submitDrawing: vi.fn() },
}));

const api = serverTossApi as unknown as { submitDrawing: Mock };

describe("그림 제출 mutation의 무효화 규칙", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.submitDrawing.mockResolvedValue({ drawingId: 1 });
  });

  it("제출 성공 시 오늘 랭킹·시상대·미션·아카이브를 무효화하고 출석은 건드리지 않는다", async () => {
    const queryClient = createTestQueryClient();
    const keys = {
      rankingMe: ["rankings", "me", "2026-05-04"],
      rankingList: ["rankings", "list", "2026-05-04"],
      podium: ["podium", "2026-05-04"],
      missions: ["missions", "today", "2026-05-04"],
      archive: ["archive", "summary", "2026-05-04"],
      attendance: ["attendance", "status", "2026-05-04"],
    };
    Object.values(keys).forEach((key) => queryClient.setQueryData(key, {}));

    const { result } = renderHook(() => useSubmitDrawing(), {
      wrapper: withQueryClient(queryClient),
    });
    await act(async () => {
      await result.current.mutateAsync([]);
    });

    const invalidated = (key: unknown[]) =>
      queryClient.getQueryState(key)?.isInvalidated === true;
    expect(invalidated(keys.rankingMe)).toBe(true);
    expect(invalidated(keys.rankingList)).toBe(true);
    expect(invalidated(keys.podium)).toBe(true);
    expect(invalidated(keys.missions)).toBe(true);
    expect(invalidated(keys.archive)).toBe(true);
    expect(invalidated(keys.attendance)).toBe(false);
  });

  it("제출 실패 시에는 아무것도 무효화하지 않는다", async () => {
    api.submitDrawing.mockRejectedValue(new Error("서버 오류"));
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["rankings", "me", "2026-05-04"], {});

    const { result } = renderHook(() => useSubmitDrawing(), {
      wrapper: withQueryClient(queryClient),
    });
    await act(async () => {
      await result.current.mutateAsync([]).catch(() => {});
    });

    expect(
      queryClient.getQueryState(["rankings", "me", "2026-05-04"])
        ?.isInvalidated,
    ).toBe(false);
  });
});
