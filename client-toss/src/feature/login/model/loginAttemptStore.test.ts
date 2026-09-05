import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  incrementLoginAttempt,
  readLoginAttempt,
  resetLoginAttempt,
} from "./loginAttemptStore";

describe("로그인 시도 횟수 저장소", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("기록이 없으면 0으로 읽는다", () => {
    expect(readLoginAttempt()).toBe(0);
  });

  it("증가할 때마다 새 회차를 돌려주고 저장한다", () => {
    expect(incrementLoginAttempt()).toBe(1);
    expect(incrementLoginAttempt()).toBe(2);
    expect(readLoginAttempt()).toBe(2);
  });

  it("리셋하면 다시 0부터 센다", () => {
    incrementLoginAttempt();
    resetLoginAttempt();

    expect(readLoginAttempt()).toBe(0);
  });

  it("모듈을 다시 불러와도 값이 남아 리로드를 넘긴다", async () => {
    incrementLoginAttempt();
    vi.resetModules();

    const fresh = await import("./loginAttemptStore");

    expect(fresh.readLoginAttempt()).toBe(1);
  });

  it("손상된 값은 0으로 취급한다", () => {
    sessionStorage.setItem("login_attempt", "abc");

    expect(readLoginAttempt()).toBe(0);
  });

  it("저장소 쓰기가 막혀 있어도 회차는 돌려준다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(incrementLoginAttempt()).toBe(1);
  });
});
