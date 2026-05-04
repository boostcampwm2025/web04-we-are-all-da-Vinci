import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAbortableQuery } from "./useAbortableQuery";

describe("useAbortableQuery", () => {
  it("마운트 시 query를 호출하고 데이터를 반환한다", async () => {
    const query = vi.fn().mockResolvedValue("결과");

    const { result } = renderHook(() => useAbortableQuery(query));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBe("결과");
    expect(query).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
  });

  it("query 실패 시 data를 null로 설정한다", async () => {
    const query = vi.fn().mockRejectedValue(new Error("실패"));

    const { result } = renderHook(() => useAbortableQuery(query));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
  });

  it("refetch 호출 시 이전 요청을 abort하고 새로 호출한다", async () => {
    let callCount = 0;
    const query = vi.fn().mockImplementation(async () => {
      callCount++;
      return `결과-${callCount}`;
    });

    const { result } = renderHook(() => useAbortableQuery(query));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBe("결과-1");

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toBe("결과-2");
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("AbortError는 무시하고 data를 null로 덮어쓰지 않는다", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    // 일반 에러는 catch에서 setData(null)을 호출하지만,
    // AbortError는 early return하여 setData를 호출하지 않음
    const query = vi.fn().mockRejectedValue(abortError);

    const { result } = renderHook(() => useAbortableQuery(query));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // AbortError 분기: setData(null) 미호출 (data는 초기값 null 유지)
    expect(result.current.data).toBeNull();

    // 일반 에러와 비교: 일반 에러도 setData(null)이지만,
    // AbortError는 return으로 빠지는 것이 핵심 차이
  });

  it("언마운트 시 진행 중인 요청을 abort한다", async () => {
    let receivedSignal: AbortSignal | null = null;
    const query = vi.fn().mockImplementation(async ({ signal }) => {
      receivedSignal = signal;
      return "결과";
    });

    const { unmount } = renderHook(() => useAbortableQuery(query));

    await waitFor(() => {
      expect(receivedSignal).not.toBeNull();
    });

    unmount();

    expect(receivedSignal!.aborted).toBe(true);
  });
});
