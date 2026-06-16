/// <reference types="@testing-library/jest-dom/vitest" />
import { fireEvent, render, screen } from "@testing-library/react";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRankingList } from "../hooks/useRankingList";
import type { RankingListItem } from "../model/types";
import RankingList from "./RankingList";

vi.mock("../hooks/useRankingList", () => ({
  useRankingList: vi.fn(),
}));

vi.mock("@toss/tds-mobile", () => ({
  Skeleton: () => <div data-testid="ranking-list-skeleton" />,
  Paragraph: Object.assign(
    ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    {
      Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    },
  ),
}));

vi.mock("@/entities/drawingCanvas", () => ({
  ReplayDrawingCanvas: ({ ariaLabel }: { ariaLabel?: string }) => (
    <div role="img" aria-label={ariaLabel} />
  ),
}));

vi.mock("@/entities/myScoreCard", () => ({
  DrawingScoreDetailSheet: ({
    open,
    title,
  }: {
    open: boolean;
    title?: ReactNode;
  }) => (open ? <div role="dialog">{title}</div> : null),
}));

vi.mock("@/shared/ui/bannerAd", () => ({
  BannerAd: () => <div data-testid="ranking-banner-ad" />,
}));

const mockUseRankingList = vi.mocked(useRankingList);
const strokes: Stroke[] = [{ points: [[1], [2]], color: [0, 0, 0] }];
const similarity: SimilarityResponse = {
  score: 99.9,
  shapeSimilarity: 50,
  strokeMatchSimilarity: 50,
  penalty: 0,
};

const makeRanking = (rank: number): RankingListItem => ({
  userKey: 1000 + rank,
  nickname: `테스트다빈치${rank}`,
  drawingId: String(rank),
  rank,
  score: 100 - rank,
  isMe: rank === 1,
  strokes,
  similarity: {
    ...similarity,
    score: 100 - rank,
  },
});

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

  it("랭킹 목록이 있으면 캔버스 갤러리 항목을 렌더링한다", () => {
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

    expect(
      screen.getByRole("button", {
        name: "1위 김동권닉 그림 상세 보기",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "1위 김동권닉 그림" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "아직 아무도 그림을 제출하지 않았어요 첫 번째 플레이어가 되어보세요!",
      ),
    ).not.toBeInTheDocument();
  });

  it("캔버스를 클릭하면 순위와 닉네임이 포함된 상세 시트를 연다", () => {
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

    fireEvent.click(
      screen.getByRole("button", {
        name: "2위 다른유저 그림 상세 보기",
      }),
    );

    expect(screen.getByRole("dialog")).toHaveTextContent("2위 다른유저");
  });

  it("캔버스 6개 단위 사이에 배너 광고를 렌더링한다", () => {
    mockUseRankingList.mockReturnValue({
      rankingList: Array.from({ length: 7 }, (_, index) =>
        makeRanking(index + 1),
      ),
      isLoading: false,
    });

    render(<RankingList />);

    expect(screen.getAllByTestId("ranking-banner-ad")).toHaveLength(1);
  });
});
