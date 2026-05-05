import type { Stroke } from "@toss/shared";

const NORMALIZE_SIZE = 500;
// 캔버스 좌표를 500x500 정규화 공간으로 변환 (서버 저장용)

export const normalizeStrokes = (
  strokes: Stroke[],
  canvasSize: number,
): Stroke[] => {
  if (canvasSize === 0) return strokes;
  const scale = NORMALIZE_SIZE / canvasSize;

  return strokes.map((stroke) => ({
    points: [
      stroke.points[0].map((x) => x * scale),
      stroke.points[1].map((y) => y * scale),
    ] as [number[], number[]],
    color: stroke.color,
  }));
};
