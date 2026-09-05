/// <reference types="@testing-library/jest-dom/vitest" />
import { clearAccessToken, setAccessToken } from "@/shared/api";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RequireToken from "./RequireToken";

const childRender = vi.fn();

const Child = () => {
  childRender();
  return <div>보호된 화면</div>;
};

const LoginStub = () => <div>로그인 화면</div>;

const renderAt = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginStub />} />
        <Route
          path="/"
          element={
            <RequireToken>
              <Child />
            </RequireToken>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("토큰 게이트", () => {
  beforeEach(() => {
    localStorage.clear();
    childRender.mockClear();
  });

  it("토큰이 없으면 자식을 한 번도 렌더하지 않고 로그인 화면으로 보낸다", () => {
    renderAt();

    expect(screen.getByText("로그인 화면")).toBeInTheDocument();
    expect(childRender).not.toHaveBeenCalled();
  });

  it("토큰이 있으면 자식을 그대로 렌더한다", () => {
    setAccessToken("token");

    renderAt();

    expect(screen.getByText("보호된 화면")).toBeInTheDocument();
    expect(screen.queryByText("로그인 화면")).not.toBeInTheDocument();
  });

  it("세션이 지워지면 로그인 화면으로 전환한다", () => {
    setAccessToken("token");
    renderAt();

    act(() => {
      clearAccessToken();
    });

    expect(screen.getByText("로그인 화면")).toBeInTheDocument();
    expect(screen.queryByText("보호된 화면")).not.toBeInTheDocument();
  });
});
