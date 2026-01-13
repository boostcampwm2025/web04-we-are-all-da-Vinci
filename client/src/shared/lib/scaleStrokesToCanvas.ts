// TODO: AI 생성 코드 - 500x500 고정 크기 이미지에 대한 중복 스케일링 로직 최적화 및 연산 성능 검증 필요
import type { Stroke } from '@/entities/similarity/model';

interface ScaleResult {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * strokes 좌표를 캔버스 크기에 맞게 스케일링 및 중앙 정렬하기 위한 값 계산
 * @param strokes - 스케일링할 strokes 데이터
 * @param canvasWidth - 타겟 캔버스 너비
 * @param canvasHeight - 타겟 캔버스 높이
 * @param padding - 여백 (기본값: 20)
 * @returns scale, offsetX, offsetY 값
 */
export const calculateStrokeScale = (
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 20,
): ScaleResult => {
  // strokes의 좌표 범위 계산
  const bounds = strokes.reduce(
    (acc, stroke) => {
      const [xPoints, yPoints] = stroke.points;
      return {
        minX: Math.min(acc.minX, ...xPoints),
        maxX: Math.max(acc.maxX, ...xPoints),
        minY: Math.min(acc.minY, ...yPoints),
        maxY: Math.max(acc.maxY, ...yPoints),
      };
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );

  // 스케일 계산 (비율 유지하면서 캔버스에 맞춤)
  const originalWidth = bounds.maxX - bounds.minX;
  const originalHeight = bounds.maxY - bounds.minY;
  const scale = Math.min(
    (canvasWidth - padding * 2) / originalWidth,
    (canvasHeight - padding * 2) / originalHeight,
  );

  // 중앙 정렬을 위한 오프셋 계산
  const scaledWidth = originalWidth * scale;
  const scaledHeight = originalHeight * scale;
  const offsetX = (canvasWidth - scaledWidth) / 2 - bounds.minX * scale;
  const offsetY = (canvasHeight - scaledHeight) / 2 - bounds.minY * scale;

  return { scale, offsetX, offsetY };
};

/**
 * 좌표를 스케일링 및 변환
 * @param x - 원본 x 좌표
 * @param y - 원본 y 좌표
 * @param scale - 스케일 값
 * @param offsetX - x 오프셋
 * @param offsetY - y 오프셋
 * @returns 변환된 { x, y } 좌표
 */
export const transformPoint = (
  x: number,
  y: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): { x: number; y: number } => {
  return {
    x: x * scale + offsetX,
    y: y * scale + offsetY,
  };
};
