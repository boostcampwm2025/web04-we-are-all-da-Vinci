/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ArchiveView from "./ArchiveView";

const getMe = vi.fn();
const getArchiveSummary = vi.fn();
const getArchiveDay = vi.fn();

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    getMe: (...args: unknown[]) => getMe(...args),
    getArchiveSummary: (...args: unknown[]) => getArchiveSummary(...args),
    getArchiveDay: (...args: unknown[]) => getArchiveDay(...args),
  },
}));

vi.mock("@toss/tds-mobile", () => {
  const passthrough = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: ReactNode }) => (
    <div {...props}>{children}</div>
  );
  return {
    Top: Object.assign(
      ({
        title,
        subtitleBottom,
      }: {
        title?: ReactNode;
        subtitleBottom?: ReactNode;
      }) => (
        <div>
          {title}
          {subtitleBottom}
        </div>
      ),
      {
        TitleParagraph: ({ children }: { children?: ReactNode }) => (
          <h2>{children}</h2>
        ),
        SubtitleParagraph: ({ children }: { children?: ReactNode }) => (
          <p>{children}</p>
        ),
      },
    ),
    Asset: { Icon: () => <span data-testid="asset-icon" /> },
    Badge: passthrough,
    Button: passthrough,
    Skeleton: () => <div data-testid="skeleton" />,
    TextButton: passthrough,
    BottomSheet: Object.assign(passthrough, {
      Header: passthrough,
    }),
  };
});

vi.mock("@toss/tds-colors", () => ({
  colors: { blue500: "#3182f6", grey300: "#d1d6db" },
}));

vi.mock("@/shared/ui/bannerAd", () => ({
  BannerAd: () => <div data-testid="banner-ad" />,
}));

vi.mock("@/entities/drawingCanvas", () => ({
  DrawingCanvasFrame: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  StaticDrawingCanvas: () => <div data-testid="static-canvas" />,
}));

vi.mock("@/entities/myScoreCard", () => ({
  DrawingScoreDetailSheet: () => null,
}));

const emptySummary = {
  dates: [],
  stats: {
    totalDrawingCount: 0,
    playDays: 0,
    bestScore: null,
    bestRank: null,
  },
};

describe("나의 기록 화면", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getArchiveSummary.mockResolvedValue(emptySummary);
  });

  it("헤더에 내 닉네임을 노출한다", async () => {
    getMe.mockResolvedValue({
      userKey: 1,
      name: "이름",
      nickname: "테스트다빈치",
    });

    render(<ArchiveView />);

    expect(await screen.findByText("테스트다빈치")).toBeInTheDocument();
    expect(screen.getByText("나의 기록")).toBeInTheDocument();
  });

  it("내 정보 조회에 실패하면 닉네임 칩을 노출하지 않는다", async () => {
    getMe.mockRejectedValue(new Error("실패"));

    render(<ArchiveView />);

    // 헤더 자체는 정상 렌더되지만 닉네임 칩만 빠진다
    expect(await screen.findByText("나의 기록")).toBeInTheDocument();
    await waitFor(() => expect(getMe).toHaveBeenCalled());
    expect(screen.queryByText("테스트다빈치")).not.toBeInTheDocument();
  });
});
