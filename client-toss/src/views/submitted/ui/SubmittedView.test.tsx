/// <reference types="@testing-library/jest-dom/vitest" />
import { serverTossApi } from "@/shared/api";
import {
  appLogin,
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SubmittedView from "./SubmittedView";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    login: vi.fn().mockResolvedValue({ accessToken: "test-token" }),
    getMe: vi.fn().mockResolvedValue({ userKey: 123 }),
    submitDrawing: vi.fn().mockResolvedValue({ drawingId: 1, similarity: {} }),
  },
}));

vi.mock("@/shared/ui/bannerAd", () => ({
  BannerAd: () => <div data-testid="banner-ad" />,
}));

vi.mock("@/shared/ui/score", () => ({
  Score: ({ value }: { value: number }) => <span>{value}점</span>,
}));

vi.mock("@/shared/assets/images", () => ({
  painterMan1Img: "painter.png",
}));

const mockRouteState = {
  promptId: 1,
  strokes: [{ points: [[10], [20]], color: [0, 0, 0] }],
  similarity: {
    score: 75.5,
    shapeSimilarity: 80,
    strokeMatchSimilarity: 70,
    penalty: 5,
  },
  anonymousHash: "test-hash",
};

const renderWithState = (state?: unknown) =>
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: "/submitted", state: state ?? mockRouteState },
      ]}
    >
      <Routes>
        <Route path="/submitted" element={<SubmittedView />} />
        <Route path="/" element={<div>홈</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("SubmittedView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(loadFullScreenAd.isSupported).mockReturnValue(false);
  });

  it("점수와 제출 완료 텍스트가 렌더링된다", () => {
    renderWithState();

    expect(screen.getByText("그림을 제출했어요")).toBeInTheDocument();
    expect(screen.getByText("76점")).toBeInTheDocument(); // Math.round(75.5)
  });

  it("결과 저장 시 lastPlayed가 API 호출 전에 저장된다", async () => {
    const user = userEvent.setup();
    let lastPlayedAtApiCall: string | null = null;

    vi.mocked(serverTossApi.submitDrawing).mockImplementation(async () => {
      lastPlayedAtApiCall = localStorage.getItem("lastPlayed_test-hash");
      return { drawingId: 1, similarity: {} } as never;
    });

    renderWithState();

    await user.click(screen.getByText("저장하고 결과확인하기"));

    await waitFor(() => {
      expect(serverTossApi.submitDrawing).toHaveBeenCalled();
    });

    const today = new Date().toISOString().slice(0, 10);
    expect(lastPlayedAtApiCall).toBe(today);
  });

  it("비로그인 시 appLogin → login → getMe 순서로 호출된다", async () => {
    const user = userEvent.setup();
    const callOrder: string[] = [];

    vi.mocked(appLogin).mockImplementation(async () => {
      callOrder.push("appLogin");
      return { authorizationCode: "code", referrer: "SANDBOX" as const };
    });
    vi.mocked(serverTossApi.login).mockImplementation(async () => {
      callOrder.push("login");
      return { accessToken: "token" };
    });
    vi.mocked(serverTossApi.getMe).mockImplementation(async () => {
      callOrder.push("getMe");
      return { userKey: 123 };
    });

    renderWithState();

    await user.click(screen.getByText("저장하고 결과확인하기"));

    await waitFor(() => {
      expect(callOrder).toEqual(["appLogin", "login", "getMe"]);
    });
  });

  it("submitDrawing 후 홈으로 이동한다", async () => {
    const user = userEvent.setup();
    localStorage.setItem("userKey", "existing-user");

    renderWithState();

    await user.click(screen.getByText("저장하고 결과확인하기"));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("submitDrawing 실패해도 홈으로 이동한다", async () => {
    const user = userEvent.setup();
    localStorage.setItem("userKey", "existing-user");
    vi.mocked(serverTossApi.submitDrawing).mockRejectedValue(
      new Error("서버 오류"),
    );

    renderWithState();

    await user.click(screen.getByText("저장하고 결과확인하기"));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("submitDrawing 실패해도 lastPlayed가 유지된다", async () => {
    const user = userEvent.setup();
    localStorage.setItem("userKey", "existing-user");
    vi.mocked(serverTossApi.submitDrawing).mockRejectedValue(new Error("실패"));

    renderWithState();

    await user.click(screen.getByText("저장하고 결과확인하기"));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled();
    });

    const today = new Date().toISOString().slice(0, 10);
    expect(localStorage.getItem("lastPlayed_test-hash")).toBe(today);
  });

  it("route state 없이 접근하면 홈으로 리다이렉트된다", () => {
    render(
      <MemoryRouter initialEntries={["/submitted"]}>
        <Routes>
          <Route path="/submitted" element={<SubmittedView />} />
          <Route path="/" element={<div>홈</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // useRequiredState가 navigate("/", { replace: true }) 호출
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });

  it("보상형 광고 지원 시 loadFullScreenAd를 호출한다", async () => {
    vi.mocked(loadFullScreenAd.isSupported).mockReturnValue(true);

    await act(async () => {
      renderWithState();
    });

    // useEffect에서 loadFullScreenAd가 호출됨
    expect(loadFullScreenAd).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { adGroupId: "ait-ad-test-rewarded-id" },
      }),
    );
  });

  it("보상형 광고 미지원 시 바로 홈으로 이동한다", async () => {
    const user = userEvent.setup();
    localStorage.setItem("userKey", "existing-user");
    vi.mocked(loadFullScreenAd.isSupported).mockReturnValue(false);

    renderWithState();

    await user.click(screen.getByText("저장하고 결과확인하기"));

    await waitFor(() => {
      expect(showFullScreenAd).not.toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    });
  });
});
