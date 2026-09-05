import { RequestError, clearAccessToken } from "@/shared/api";
import { describe, expect, it } from "vitest";
import { queryClient, shouldRetryQuery } from "./queryClient";

describe("서버 상태 캐시 전역 설정", () => {
  describe("재시도 분기", () => {
    it("HTTP 실패(RequestError)는 재시도하지 않는다 — 401 재발급·보고가 이미 끝난 최종 실패", () => {
      expect(shouldRetryQuery(0, new RequestError(500, "요청 실패"))).toBe(
        false,
      );
      expect(shouldRetryQuery(0, new RequestError(404, "요청 실패"))).toBe(
        false,
      );
    });

    it("네트워크 단절 등 그 외 에러는 1회만 재시도한다", () => {
      const networkError = new TypeError("Failed to fetch");
      expect(shouldRetryQuery(0, networkError)).toBe(true);
      expect(shouldRetryQuery(1, networkError)).toBe(false);
    });
  });

  it("창 포커스 복귀로는 재조회하지 않는다", () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(
      false,
    );
  });

  it("gcTime은 영속 maxAge(24시간) 이상이다 — 짧으면 콜드 복원이 비게 된다", () => {
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(
      24 * 60 * 60 * 1000,
    );
  });

  it("세션이 지워지면(로그아웃·재발급 실패) 캐시 전체를 비운다", () => {
    queryClient.setQueryData(["points", "me", "2026-05-03"], {
      totalPoints: 300,
    });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);

    clearAccessToken();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
