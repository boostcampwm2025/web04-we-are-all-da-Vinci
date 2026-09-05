/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginView from "./LoginView";

const { useLoginFlowMock, trackClickMock } = vi.hoisted(() => ({
  useLoginFlowMock: vi.fn(),
  trackClickMock: vi.fn(),
}));

vi.mock("@/feature/login", () => ({
  useLoginFlow: useLoginFlowMock,
}));

vi.mock("@/shared/lib", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib")>()),
  trackClick: trackClickMock,
}));

const handleLogin = vi.fn();

const flow = (overrides: Record<string, unknown> = {}) => ({
  handleLogin,
  isLoading: false,
  errorMessage: null,
  attempt: 0,
  ...overrides,
});

describe("토스 로그인 화면", () => {
  beforeEach(() => {
    handleLogin.mockClear();
    trackClickMock.mockClear();
    useLoginFlowMock.mockReturnValue(flow());
  });

  // TDS BottomCTA.Single은 테스트 목에서 div로 렌더되므로 role 대신 라벨 텍스트로 찾는다.
  it("처음에는 다음 버튼만 보이고 안내 문구는 없다", () => {
    render(<LoginView />);

    expect(screen.getByText("다음")).toBeInTheDocument();
    expect(screen.queryByText("다시 시도하기")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("실패 문구가 있으면 문구와 다시 시도하기 버튼을 보여준다", () => {
    useLoginFlowMock.mockReturnValue(
      flow({ errorMessage: "로그인 안내 문구", attempt: 1 }),
    );

    render(<LoginView />);

    expect(screen.getByRole("status")).toHaveTextContent("로그인 안내 문구");
    expect(screen.getByText("다시 시도하기")).toBeInTheDocument();
    expect(screen.queryByText("다음")).not.toBeInTheDocument();
  });

  it("버튼을 누르면 회차와 재시도 여부를 계측하고 로그인을 시작한다", async () => {
    useLoginFlowMock.mockReturnValue(
      flow({ errorMessage: "로그인 안내 문구", attempt: 1 }),
    );
    render(<LoginView />);

    await userEvent.click(screen.getByText("다시 시도하기"));

    expect(trackClickMock).toHaveBeenCalledWith("login_button_click", {
      source: "login_view",
      attempt: 2,
      is_retry: true,
    });
    expect(handleLogin).toHaveBeenCalledTimes(1);
  });

  it("로그인 진행 중에는 버튼이 비활성화된다", () => {
    useLoginFlowMock.mockReturnValue(flow({ isLoading: true }));

    render(<LoginView />);

    expect(screen.getByText("다음")).toHaveAttribute("disabled");
  });
});
