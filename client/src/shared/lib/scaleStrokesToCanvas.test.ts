import { describe, it, expect } from 'vitest';
import { calculateStrokeScale, transformPoint } from './scaleStrokesToCanvas';
import type { Stroke } from '@/entities/similarity';

describe('scaleStrokesToCanvas', () => {
  describe('calculateStrokeScale', () => {
    it('작은 그림을 캔버스에 맞게 확대해야 함', () => {
      // 100x100 크기의 작은 그림
      const strokes: Stroke[] = [
        {
          points: [
            [50, 100, 150],
            [50, 100, 150],
          ],
          color: [0, 0, 0],
        },
      ];

      const result = calculateStrokeScale(strokes, 500, 500, 20);

      // 원본: 50~150 (100x100)
      // 타겟: 500 - 40 = 460
      // scale: 460 / 100 = 4.6
      expect(result.scale).toBe(4.6);
    });

    it('큰 그림을 캔버스에 맞게 축소해야 함', () => {
      // 800x800 크기의 큰 그림
      const strokes: Stroke[] = [
        {
          points: [
            [0, 400, 800],
            [0, 400, 800],
          ],
          color: [0, 0, 0],
        },
      ];

      const result = calculateStrokeScale(strokes, 500, 500, 20);

      // 원본: 0~800 (800x800)
      // 타겟: 500 - 40 = 460
      // scale: 460 / 800 = 0.575
      expect(result.scale).toBe(0.575);
    });

    it('비율이 다른 그림의 경우 작은 비율을 선택해야 함', () => {
      // 가로로 긴 그림: 200x100
      const strokes: Stroke[] = [
        {
          points: [
            [50, 150, 250],
            [50, 100, 150],
          ],
          color: [0, 0, 0],
        },
      ];

      const result = calculateStrokeScale(strokes, 500, 500, 20);

      // 원본: 200x100
      // 가로 기준: 460 / 200 = 2.3
      // 세로 기준: 460 / 100 = 4.6
      // Math.min(2.3, 4.6) = 2.3
      expect(result.scale).toBe(2.3);
    });

    it('여러 stroke의 좌표 범위를 모두 고려해야 함', () => {
      const strokes: Stroke[] = [
        {
          points: [
            [50, 100],
            [50, 100],
          ],
          color: [0, 0, 0],
        },
        {
          points: [
            [150, 200],
            [150, 200],
          ],
          color: [255, 0, 0],
        },
      ];

      const result = calculateStrokeScale(strokes, 500, 500, 20);

      // 전체 범위: 50~200 (150x150)
      // scale: 460 / 150 ≈ 3.067
      expect(result.scale).toBeCloseTo(3.067, 2);
    });

    it('중앙 정렬을 위한 오프셋을 올바르게 계산해야 함', () => {
      // 80~200, 50~150 범위의 그림
      const strokes: Stroke[] = [
        {
          points: [
            [80, 200],
            [50, 150],
          ],
          color: [0, 0, 0],
        },
      ];

      const result = calculateStrokeScale(strokes, 500, 500, 20);

      // 원본: 120x100
      // scale: 460 / 120 ≈ 3.833

      // scaledWidth: 120 * 3.833 = 460
      // offsetX: (500 - 460) / 2 - 80 * 3.833
      //        = 20 - 306.64
      //        = -286.64
      expect(result.offsetX).toBeCloseTo(-286.64, 1);

      // scaledHeight: 100 * 3.833 = 383.3
      // offsetY: (500 - 383.3) / 2 - 50 * 3.833
      //        = 58.35 - 191.65
      //        = -133.3
      expect(result.offsetY).toBeCloseTo(-133.3, 1);
    });

    it('커스텀 padding을 적용할 수 있어야 함', () => {
      const strokes: Stroke[] = [
        {
          points: [
            [0, 100],
            [0, 100],
          ],
          color: [0, 0, 0],
        },
      ];

      const result = calculateStrokeScale(strokes, 500, 500, 50);

      // padding: 50
      // 사용 가능 공간: 500 - 100 = 400
      // scale: 400 / 100 = 4
      expect(result.scale).toBe(4);
    });

    it('정사각형이 아닌 캔버스에서도 동작해야 함', () => {
      const strokes: Stroke[] = [
        {
          points: [
            [0, 100],
            [0, 100],
          ],
          color: [0, 0, 0],
        },
      ];

      const result = calculateStrokeScale(strokes, 800, 400, 20);

      // 원본: 100x100
      // 가로: (800 - 40) / 100 = 7.6
      // 세로: (400 - 40) / 100 = 3.6
      // Math.min(7.6, 3.6) = 3.6
      expect(result.scale).toBe(3.6);
    });
  });

  describe('transformPoint', () => {
    it('좌표를 올바르게 변환해야 함', () => {
      const result = transformPoint(100, 80, 2, 50, 30);

      // x: 100 * 2 + 50 = 250
      // y: 80 * 2 + 30 = 190
      expect(result.x).toBe(250);
      expect(result.y).toBe(190);
    });

    it('음수 오프셋을 올바르게 처리해야 함', () => {
      const result = transformPoint(100, 80, 3.83, -286.4, -133);

      // x: 100 * 3.83 + (-286.4) = 383 - 286.4 = 96.6
      // y: 80 * 3.83 + (-133) = 306.4 - 133 = 173.4
      expect(result.x).toBeCloseTo(96.6, 1);
      expect(result.y).toBeCloseTo(173.4, 1);
    });

    it('scale이 1보다 작을 때 축소해야 함', () => {
      const result = transformPoint(100, 100, 0.5, 0, 0);

      // x: 100 * 0.5 + 0 = 50
      // y: 100 * 0.5 + 0 = 50
      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });

    it('원점(0, 0)을 올바르게 변환해야 함', () => {
      const result = transformPoint(0, 0, 2, 100, 150);

      // x: 0 * 2 + 100 = 100
      // y: 0 * 2 + 150 = 150
      expect(result.x).toBe(100);
      expect(result.y).toBe(150);
    });
  });

  describe('통합 테스트', () => {
    it('작은 그림을 확대하고 중앙 정렬했을 때 패딩이 올바르게 적용되어야 함', () => {
      // 100x100 그림 (0~100, 0~100)
      const strokes: Stroke[] = [
        {
          points: [
            [0, 100],
            [0, 100],
          ],
          color: [0, 0, 0],
        },
      ];

      const { scale, offsetX, offsetY } = calculateStrokeScale(
        strokes,
        500,
        500,
        20,
      );

      // 왼쪽 위 (0, 0) → (20, 20)이어야 함 (padding)
      const topLeft = transformPoint(0, 0, scale, offsetX, offsetY);
      expect(topLeft.x).toBeCloseTo(20, 1);
      expect(topLeft.y).toBeCloseTo(20, 1);

      // 오른쪽 아래 (100, 100) → (480, 480)이어야 함 (500 - padding)
      const bottomRight = transformPoint(100, 100, scale, offsetX, offsetY);
      expect(bottomRight.x).toBeCloseTo(480, 1);
      expect(bottomRight.y).toBeCloseTo(480, 1);
    });

    it('캔버스 중앙에 배치되지 않은 그림을 중앙 정렬해야 함', () => {
      // 왼쪽 위에 치우친 그림: 10~60, 10~60 (50x50)
      const strokes: Stroke[] = [
        {
          points: [
            [10, 60],
            [10, 60],
          ],
          color: [0, 0, 0],
        },
      ];

      const { scale, offsetX, offsetY } = calculateStrokeScale(
        strokes,
        500,
        500,
        20,
      );

      // 원본 왼쪽 위 (10, 10)이 padding 위치로
      const topLeft = transformPoint(10, 10, scale, offsetX, offsetY);
      expect(topLeft.x).toBeCloseTo(20, 1);
      expect(topLeft.y).toBeCloseTo(20, 1);

      // 원본 오른쪽 아래 (60, 60)이 캔버스 - padding 위치로
      const bottomRight = transformPoint(60, 60, scale, offsetX, offsetY);
      expect(bottomRight.x).toBeCloseTo(480, 1);
      expect(bottomRight.y).toBeCloseTo(480, 1);
    });
  });
});
