import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawStrokesOnCanvas } from './drawStrokesOnCanvas';
import { calculateStrokeScale, transformPoint } from '@/shared/lib';
import type { Stroke } from '@/entities/similarity';
import { MOCK_STROKES } from '@/test/mocks/mockStrokes';

vi.mock('@/shared/lib', () => ({
  calculateStrokeScale: vi.fn(),
  transformPoint: vi.fn(),
}));

describe('drawStrokesOnCanvas', () => {
  let mockCtx: {
    fillStyle: string;
    strokeStyle: string;
    fillRect: ReturnType<typeof vi.fn>;
    beginPath: ReturnType<typeof vi.fn>;
    moveTo: ReturnType<typeof vi.fn>;
    lineTo: ReturnType<typeof vi.fn>;
    stroke: ReturnType<typeof vi.fn>;
  };
  let mockCanvas: { width: number; height: number };
  let canvasRef: { current: HTMLCanvasElement | null };
  let ctxRef: { current: CanvasRenderingContext2D | null };

  const SAMPLE_STROKE: Stroke = {
    points: [
      [10, 20, 30],
      [15, 25, 35],
    ],
    color: [255, 0, 0],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };

    mockCanvas = { width: 500, height: 500 };

    canvasRef = { current: mockCanvas as unknown as HTMLCanvasElement };
    ctxRef = { current: mockCtx as unknown as CanvasRenderingContext2D };

    (calculateStrokeScale as any).mockReturnValue({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });

    (transformPoint as any).mockImplementation(
      (
        x: number,
        y: number,
        scale: number,
        offsetX: number,
        offsetY: number,
      ) => ({
        x: x * scale + offsetX,
        y: y * scale + offsetY,
      }),
    );
  });

  describe('early return 조건', () => {
    it('ctx가 null이면 아무것도 실행하지 않아야 한다', () => {
      ctxRef.current = null;

      drawStrokesOnCanvas(canvasRef, ctxRef, MOCK_STROKES);

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('canvas가 null이면 아무것도 실행하지 않아야 한다', () => {
      canvasRef.current = null;

      drawStrokesOnCanvas(canvasRef, ctxRef, MOCK_STROKES);

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('strokes가 없으면 아무것도 실행하지 않아야 한다', () => {
      drawStrokesOnCanvas(canvasRef, ctxRef, undefined as unknown as Stroke[]);

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });
  });

  describe('캔버스 초기화', () => {
    it('캔버스를 흰색으로 채워야 한다', () => {
      drawStrokesOnCanvas(canvasRef, ctxRef, MOCK_STROKES);

      expect(mockCtx.fillStyle).toBe('white');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 500, 500);
    });
  });

  describe('스케일 적용 (shouldScale=true)', () => {
    it('calculateStrokeScale이 호출되어야 한다', () => {
      drawStrokesOnCanvas(canvasRef, ctxRef, MOCK_STROKES, true);

      expect(calculateStrokeScale).toHaveBeenCalledWith(MOCK_STROKES, 500, 500);
    });

    it('각 포인트에 transformPoint가 적용되어야 한다', () => {
      drawStrokesOnCanvas(canvasRef, ctxRef, [SAMPLE_STROKE], true);

      expect(transformPoint).toHaveBeenCalledTimes(3);
    });
  });

  describe('스케일 미적용 (shouldScale=false)', () => {
    it('calculateStrokeScale이 호출되지 않아야 한다', () => {
      drawStrokesOnCanvas(canvasRef, ctxRef, MOCK_STROKES, false);

      expect(calculateStrokeScale).not.toHaveBeenCalled();
    });

    it('transformPoint가 호출되지 않아야 한다', () => {
      drawStrokesOnCanvas(canvasRef, ctxRef, MOCK_STROKES, false);

      expect(transformPoint).not.toHaveBeenCalled();
    });

    it('원본 좌표로 moveTo, lineTo가 호출되어야 한다', () => {
      drawStrokesOnCanvas(canvasRef, ctxRef, [SAMPLE_STROKE], false);

      expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 15);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(20, 25);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(30, 35);
    });
  });

  describe('stroke 그리기', () => {
    it('각 stroke마다 올바른 색상이 설정되어야 한다', () => {
      const strokeStyleCalls: string[] = [];
      Object.defineProperty(mockCtx, 'strokeStyle', {
        set: (value: string) => strokeStyleCalls.push(value),
        get: () => strokeStyleCalls[strokeStyleCalls.length - 1] || '',
      });

      drawStrokesOnCanvas(canvasRef, ctxRef, MOCK_STROKES, false);

      expect(strokeStyleCalls).toContain('rgb(0, 0, 0)');
      expect(strokeStyleCalls).toContain('rgb(59, 130, 246)');
    });

    it('각 stroke마다 beginPath와 stroke가 호출되어야 한다', () => {
      drawStrokesOnCanvas(canvasRef, ctxRef, MOCK_STROKES, false);

      expect(mockCtx.beginPath).toHaveBeenCalledTimes(MOCK_STROKES.length);
      expect(mockCtx.stroke).toHaveBeenCalledTimes(MOCK_STROKES.length);
    });

    it('빈 포인트 배열이면 moveTo, lineTo가 호출되지 않아야 한다', () => {
      const emptyStroke: Stroke = {
        points: [[], []],
        color: [0, 0, 0],
      };

      drawStrokesOnCanvas(canvasRef, ctxRef, [emptyStroke], false);

      expect(mockCtx.moveTo).not.toHaveBeenCalled();
      expect(mockCtx.lineTo).not.toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('기본값', () => {
    it('shouldScale 기본값은 true여야 한다', () => {
      drawStrokesOnCanvas(canvasRef, ctxRef, MOCK_STROKES);

      expect(calculateStrokeScale).toHaveBeenCalled();
    });
  });
});
