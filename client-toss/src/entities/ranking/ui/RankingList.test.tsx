/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RankingList from "./RankingList";
import { useRankingList } from "../hooks/useRankingList";

vi.mock("../hooks/useRankingList", () => ({
  useRankingList: vi.fn(),
}));

vi.mock("@toss/tds-mobile", () => ({
  List: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Skeleton: () => <div data-testid="ranking-list-skeleton" />,
  Paragraph: Object.assign(
    ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    {
      Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    },
  ),
}));

vi.mock("./RankingEntry", () => ({
  RankingEntry: ({ name, score }: { name: string; score: number }) => (
    <div>
      <span>{name}</span>
      <span>{score}점</span>
    </div>
  ),
}));

const mockUseRankingList = vi.mocked(useRankingList);

describe("RankingList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("랭킹 목록이 비어 있으면 빈 상태 문구를 렌더링한다", () => {
    mockUseRankingList.mockReturnValue({
      rankingList: [],
      isLoading: false,
    });

    render(<RankingList />);

    expect(
      screen.getByText("아직 아무도 그림을 제출하지 않았어요."),
    ).toBeInTheDocument();
  });

  it("랭킹 목록이 있으면 항목을 렌더링한다", () => {
    mockUseRankingList.mockReturnValue({
      rankingList: [
        {
          userId: "10",
          name: "김동권",
          drawingId: "100",
          rank: 1,
          score: 99.9,
          isMe: true,
        },
      ],
      isLoading: false,
    });

    render(<RankingList />);

    expect(screen.getByText("김동권")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "아직 아무도 그림을 제출하지 않았어요 첫 번째 플레이어가 되어보세요!",
      ),
    ).not.toBeInTheDocument();
  });
});
