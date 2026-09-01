import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useInFlight } from "./useInFlight";

/** 우리가 직접 결정하는 시점에 끝나는 작업. 겹치는 창을 만들기 위해 필요하다. */
const controllable = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("진행 중인 작업 합치기", () => {
  it("진행 중이면 작업을 다시 실행하지 않는다", async () => {
    const gate = controllable<string>();
    const task = vi.fn(() => gate.promise);
    const { result } = renderHook(() => useInFlight<string>());

    let first!: Promise<string>;
    let second!: Promise<string>;
    act(() => {
      first = result.current(task);
      second = result.current(task);
    });

    expect(task).toHaveBeenCalledTimes(1);

    await act(async () => {
      gate.resolve("완료");
      await Promise.all([first, second]);
    });
  });

  it("두 번째 호출자도 첫 호출의 결과를 그대로 받는다", async () => {
    const gate = controllable<string>();
    const { result } = renderHook(() => useInFlight<string>());

    let first!: Promise<string>;
    let second!: Promise<string>;
    act(() => {
      first = result.current(() => gate.promise);
      second = result.current(() => gate.promise);
    });

    await act(async () => {
      gate.resolve("첫 호출의 결과");
    });

    await expect(first).resolves.toBe("첫 호출의 결과");
    await expect(second).resolves.toBe("첫 호출의 결과");
  });

  it("작업이 끝나면 다시 실행할 수 있다", async () => {
    const task = vi.fn(() => Promise.resolve("완료"));
    const { result } = renderHook(() => useInFlight<string>());

    await act(async () => {
      await result.current(task);
    });
    await act(async () => {
      await result.current(task);
    });

    expect(task).toHaveBeenCalledTimes(2);
  });

  it("작업이 실패해도 잠금이 풀려 재시도할 수 있다", async () => {
    const task = vi
      .fn()
      .mockRejectedValueOnce(new Error("실패"))
      .mockResolvedValueOnce("성공");
    const { result } = renderHook(() => useInFlight<string>());

    await act(async () => {
      await expect(result.current(task)).rejects.toThrow("실패");
    });
    await act(async () => {
      await expect(result.current(task)).resolves.toBe("성공");
    });

    expect(task).toHaveBeenCalledTimes(2);
  });

  it("실패한 작업의 거부는 두 호출자 모두에게 전달된다", async () => {
    const gate = controllable<string>();
    const { result } = renderHook(() => useInFlight<string>());

    let first!: Promise<string>;
    let second!: Promise<string>;
    act(() => {
      first = result.current(() => gate.promise);
      second = result.current(() => gate.promise);
    });
    // 두 Promise 모두에 핸들러를 먼저 붙여 unhandled rejection을 만들지 않는다.
    const settled = Promise.allSettled([first, second]);

    await act(async () => {
      gate.reject(new Error("네트워크 오류"));
      await settled;
    });

    expect(await settled).toEqual([
      { status: "rejected", reason: expect.any(Error) },
      { status: "rejected", reason: expect.any(Error) },
    ]);
  });

  it("서로 다른 작업이어도 진행 중이면 합쳐진다", async () => {
    // 하나의 자원(기회 차감)을 두 경로(바로 시작 / 광고 보고 시작)가 공유하므로
    // 작업이 달라도 동시에 돌면 안 된다.
    const gate = controllable<string>();
    const taskA = vi.fn(() => gate.promise);
    const taskB = vi.fn(() => Promise.resolve("B"));
    const { result } = renderHook(() => useInFlight<string>());

    let a!: Promise<string>;
    let b!: Promise<string>;
    act(() => {
      a = result.current(taskA);
      b = result.current(taskB);
    });

    expect(taskA).toHaveBeenCalledTimes(1);
    expect(taskB).not.toHaveBeenCalled();

    await act(async () => {
      gate.resolve("A");
      await Promise.all([a, b]);
    });

    await expect(b).resolves.toBe("A");
  });
});
