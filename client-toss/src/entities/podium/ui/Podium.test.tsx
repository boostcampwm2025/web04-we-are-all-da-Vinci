/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePodium } from "../hooks/usePodium";
import Podium from "./Podium";

vi.mock("../hooks/usePodium", () => ({
  usePodium: vi.fn(),
}));

vi.mock("@toss/tds-mobile", () => ({
  Skeleton: () => <div data-testid="podium-skeleton" />,
  Paragraph: Object.assign(
    ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    {
      Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    },
  ),
}));

const mockUsePodium = vi.mocked(usePodium);

describe("Podium", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("로딩 중이면 스켈레톤을 렌더링한다", () => {
    mockUsePodium.mockReturnValue({
      podium: undefined,
      isLoading: true,
    });

    render(<Podium />);

    expect(screen.getByTestId("podium-skeleton")).toBeInTheDocument();
  });

  it("포디움 목록이 비어 있으면 빈 상태 문구를 렌더링한다", () => {
    mockUsePodium.mockReturnValue({
      podium: [],
      isLoading: false,
    });

    render(<Podium />);

    expect(
      screen.getByText("아직 아무도 그림을 제출하지 않았어요."),
    ).toBeInTheDocument();
  });

  it("1명만 있으면 1등 데이터와 포디움 3칸을 렌더링한다", () => {
    mockUsePodium.mockReturnValue({
      podium: [{ name: "김다빈치", score: 99 }],
      isLoading: false,
    });

    render(<Podium />);

    expect(screen.getByText("김다빈치")).toBeInTheDocument();
    expect(screen.getByText("99점")).toBeInTheDocument();
    expect(screen.getAllByTestId("podium-slot")).toHaveLength(3);
  });

  it("2명만 있으면 1위와 2위 데이터, 3위 placeholder를 렌더링한다", () => {
    mockUsePodium.mockReturnValue({
      podium: [
        { name: "김다빈치", score: 99 },
        { name: "레오", score: 88 },
      ],
      isLoading: false,
    });

    render(<Podium />);

    expect(screen.getByText("김다빈치")).toBeInTheDocument();
    expect(screen.getByText("99점")).toBeInTheDocument();
    expect(screen.getByText("레오")).toBeInTheDocument();
    expect(screen.getByText("88점")).toBeInTheDocument();
    expect(screen.getAllByTestId("podium-slot")).toHaveLength(3);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("3명이 있으면 2위, 1위, 3위 순서로 데이터를 렌더링한다", () => {
    mockUsePodium.mockReturnValue({
      podium: [
        { name: "김다빈치", score: 99 },
        { name: "레오", score: 88 },
        { name: "모나", score: 77 },
      ],
      isLoading: false,
    });

    render(<Podium />);

    const slots = screen.getAllByTestId("podium-slot");

    expect(within(slots[0]).getByText("2")).toBeInTheDocument();
    expect(within(slots[1]).getByText("1")).toBeInTheDocument();
    expect(within(slots[2]).getByText("3")).toBeInTheDocument();
    expect(screen.getByText("레오")).toBeInTheDocument();
    expect(screen.getByText("김다빈치")).toBeInTheDocument();
    expect(screen.getByText("모나")).toBeInTheDocument();
  });
});
