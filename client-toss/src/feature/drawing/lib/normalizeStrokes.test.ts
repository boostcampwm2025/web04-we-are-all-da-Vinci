import type { Stroke } from "@toss/shared";
import { describe, expect, it } from "vitest";
import { normalizeStrokes } from "./normalizeStrokes";

describe("normalizeStrokes", () => {
  it("canvasSize에서 500으로 좌표를 스케일한다", () => {
    const strokes: Stroke[] = [
      {
        points: [
          [100, 200],
          [50, 150],
        ],
        color: [0, 0, 0],
      },
    ];

    const result = normalizeStrokes(strokes, 250);

    // scale = 500 / 250 = 2
    expect(result[0].points[0]).toEqual([200, 400]);
    expect(result[0].points[1]).toEqual([100, 300]);
  });

  it("색상 RGB 값이 변경되지 않는다", () => {
    const strokes: Stroke[] = [{ points: [[10], [20]], color: [255, 128, 0] }];

    const result = normalizeStrokes(strokes, 100);

    expect(result[0].color).toEqual([255, 128, 0]);
  });

  it("빈 배열을 입력하면 빈 배열을 반환한다", () => {
    expect(normalizeStrokes([], 300)).toEqual([]);
  });

  it("canvasSize가 0이면 원본 strokes를 그대로 반환한다", () => {
    const strokes: Stroke[] = [
      {
        points: [
          [10, 20],
          [30, 40],
        ],
        color: [0, 0, 0],
      },
    ];

    const result = normalizeStrokes(strokes, 0);

    expect(result).toBe(strokes);
  });
});
