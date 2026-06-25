/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { describe, expect, it, vi } from "vitest";
import DrawingScoreDetailSheet from "./DrawingScoreDetailSheet";

const strokes: Stroke[] = [
  {
    points: [
      [1, 2],
      [3, 4],
    ],
    color: [0, 0, 0],
  },
];

const similarity: SimilarityResponse = {
  score: 87.65,
  strokeMatchSimilarity: 40,
  shapeSimilarity: 50,
  penalty: 2.35,
};

describe("그림 점수 상세 시트", () => {
  it("열려 있으면 작은 캔버스와 점수 상세를 렌더링한다", () => {
    render(
      <DrawingScoreDetailSheet
        open
        onClose={vi.fn()}
        strokes={strokes}
        similarity={similarity}
      />,
    );

    expect(screen.getByLabelText("제출한 그림 미리보기")).toBeInTheDocument();
    expect(screen.getByText("기억력 점수 분석")).toBeInTheDocument();
    expect(screen.getByText("87.65점")).toBeInTheDocument();
    expect(screen.getByText("선 유사도")).toBeInTheDocument();
    expect(screen.getByText("형태 유사도")).toBeInTheDocument();
    expect(screen.getByText("감점")).toBeInTheDocument();
  });

  it("title을 넘기면 헤더 제목으로 사용한다", () => {
    render(
      <DrawingScoreDetailSheet
        open
        onClose={vi.fn()}
        strokes={strokes}
        similarity={similarity}
        title="1위 다빈치닉"
      />,
    );

    expect(screen.getByText("1위 다빈치닉")).toBeInTheDocument();
  });

  it("rank를 넘기면 프리뷰에 순위 배지를 노출한다", () => {
    render(
      <DrawingScoreDetailSheet
        open
        onClose={vi.fn()}
        strokes={strokes}
        similarity={similarity}
        title="2위 다빈치닉"
        rank={2}
      />,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("isMe면 프리뷰에 내가 그린 그림 배지를 노출한다", () => {
    render(
      <DrawingScoreDetailSheet
        open
        onClose={vi.fn()}
        strokes={strokes}
        similarity={similarity}
        title="5위 다빈치닉"
        rank={5}
        isMe
      />,
    );

    expect(screen.getByText("내가 그린 그림")).toBeInTheDocument();
  });

  it("isMe가 아니면 내가 그린 그림 배지를 노출하지 않는다", () => {
    render(
      <DrawingScoreDetailSheet
        open
        onClose={vi.fn()}
        strokes={strokes}
        similarity={similarity}
        title="5위 다빈치닉"
        rank={5}
      />,
    );

    expect(screen.queryByText("내가 그린 그림")).not.toBeInTheDocument();
  });
});
