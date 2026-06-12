/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRankingList } from "../hooks/useRankingList";
import RankingList from "./RankingList";

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
  RankingEntry: ({
    nickname,
    score,
    isMe,
  }: {
    nickname: string;
    score: number;
    isMe: boolean;
  }) => (
    <div>
      <span>{isMe ? `${nickname} (나)` : nickname}</span>
      <span>{score}점</span>
    </div>
  ),
}));

const mockUseRankingList = vi.mocked(useRankingList);
const strokes: Stroke[] = [{ points: [[1], [2]], color: [0, 0, 0] }];
const similarity: SimilarityResponse = {
  score: 99.9,
  shapeSimilarity: 50,
  strokeMatchSimilarity: 50,
  penalty: 0,
};

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
          userKey: 10,
          nickname: "김동권닉",
          drawingId: "100",
          rank: 1,
          score: 99.9,
          isMe: true,
          strokes,
          similarity,
        },
      ],
      isLoading: false,
    });

    render(<RankingList />);

    expect(screen.getByText("김동권닉 (나)")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "아직 아무도 그림을 제출하지 않았어요 첫 번째 플레이어가 되어보세요!",
      ),
    ).not.toBeInTheDocument();
  });

  it("본인이 아닌 항목에는 (나) 라벨이 붙지 않는다", () => {
    mockUseRankingList.mockReturnValue({
      rankingList: [
        {
          userKey: 20,
          nickname: "다른유저",
          drawingId: "200",
          rank: 2,
          score: 80.5,
          isMe: false,
          strokes,
          similarity: {
            ...similarity,
            score: 80.5,
          },
        },
      ],
      isLoading: false,
    });

    render(<RankingList />);

    expect(screen.getByText("다른유저")).toBeInTheDocument();
    expect(screen.queryByText("다른유저 (나)")).not.toBeInTheDocument();
  });
});
