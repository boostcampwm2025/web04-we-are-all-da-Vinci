import { serverTossApi } from "@/shared/api";
import { createTestQueryClient, withQueryClient } from "@/shared/testing";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import {
  useCheckInAttendance,
  useDeclineAttendanceRecovery,
  useRecoverAttendance,
} from "./attendanceMutations";

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    checkInAttendance: vi.fn(),
    recoverAttendance: vi.fn(),
    declineAttendanceRecovery: vi.fn(),
  },
}));

const api = serverTossApi as unknown as {
  checkInAttendance: Mock;
  recoverAttendance: Mock;
  declineAttendanceRecovery: Mock;
};

describe("출석 mutation의 무효화 규칙", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.checkInAttendance.mockResolvedValue({ status: "continued" });
    api.recoverAttendance.mockResolvedValue({ cycleDay: 3 });
    api.declineAttendanceRecovery.mockResolvedValue({ cycleDay: 1 });
  });

  const seed = () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["attendance", "status", "2026-05-04"], {});
    queryClient.setQueryData(["points", "summary", "2026-05-04"], {});
    queryClient.setQueryData(["rankings", "me", "2026-05-04"], {});
    return queryClient;
  };

  const isInvalidated = (
    queryClient: ReturnType<typeof seed>,
    queryKey: unknown[],
  ) => queryClient.getQueryState(queryKey)?.isInvalidated === true;

  it.each([
    ["체크인", useCheckInAttendance, undefined],
    ["복구", useRecoverAttendance, { adGroupId: "ad" }],
    ["복구 포기", useDeclineAttendanceRecovery, undefined],
  ] as const)(
    "%s 성공 시 출석 현황과 포인트를 함께 무효화하고 랭킹은 건드리지 않는다",
    async (_label, useHook, variables) => {
      const queryClient = seed();
      const { result } = renderHook(() => useHook(), {
        wrapper: withQueryClient(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync(variables as never);
      });

      expect(
        isInvalidated(queryClient, ["attendance", "status", "2026-05-04"]),
      ).toBe(true);
      expect(
        isInvalidated(queryClient, ["points", "summary", "2026-05-04"]),
      ).toBe(true);
      expect(isInvalidated(queryClient, ["rankings", "me", "2026-05-04"])).toBe(
        false,
      );
    },
  );

  it("복구 mutation은 광고 페이로드를 그대로 서버에 넘긴다", async () => {
    const { result } = renderHook(() => useRecoverAttendance(), {
      wrapper: withQueryClient(),
    });

    await act(async () => {
      await result.current.mutateAsync({ adGroupId: "ad-group" });
    });

    expect(api.recoverAttendance).toHaveBeenCalledWith({
      adGroupId: "ad-group",
    });
  });
});
