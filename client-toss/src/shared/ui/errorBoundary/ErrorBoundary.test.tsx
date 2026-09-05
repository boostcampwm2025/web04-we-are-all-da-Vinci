import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./index";

const Bomb = () => {
  throw new Error("렌더 크래시");
};

describe("렌더 에러 경계", () => {
  beforeEach(() => {
    // React가 에러 경계 동작 시 콘솔에 남기는 로그를 잠재운다
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("자식이 렌더 중 던지면 흰 화면 대신 폴백을 보여준다", () => {
    render(
      <ErrorBoundary fallback={() => <p>문제가 생겼어요</p>}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("문제가 생겼어요")).toBeInTheDocument();
  });

  it("에러가 없으면 자식을 그대로 렌더한다", () => {
    render(
      <ErrorBoundary fallback={() => <p>문제가 생겼어요</p>}>
        <p>정상 화면</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("정상 화면")).toBeInTheDocument();
    expect(screen.queryByText("문제가 생겼어요")).not.toBeInTheDocument();
  });
});
