import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Stroke } from '@/entities/similarity/model';
import { animateDrawing } from './animateDrawing';
import type { RefObject } from 'react';

describe('animateDrawing', () => {
  let canvasRef: RefObject<HTMLCanvasElement | null>;
  let ctxRef: RefObject<CanvasRenderingContext2D | null>;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: Partial<CanvasRenderingContext2D>;

  beforeEach(() => {
    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };

    mockCanvas = {
      width: 500,
      height: 500,
    } satisfies Partial<HTMLCanvasElement> as HTMLCanvasElement;

    canvasRef = {
      current: mockCanvas,
    };
    ctxRef = {
      current: mockCtx as CanvasRenderingContext2D,
    };

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('초기화 및 기본 동작', () => {
    it('빈 strokes 배열일 때 cleanup 함수를 반환해야 한다', () => {
      // Given & When
      const cleanup = animateDrawing(canvasRef, ctxRef, [], 40, false);

      // Then
      expect(cleanup).toBeInstanceOf(Function);
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('canvas가 null일 때 cleanup 함수를 반환해야 한다', () => {
      // Given
      const nullCanvasRef = { current: null };

      // When
      const cleanup = animateDrawing(nullCanvasRef, ctxRef, [], 40, false);

      // Then
      expect(cleanup).toBeInstanceOf(Function);
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('ctx가 null일 때 cleanup 함수를 반환해야 한다', () => {
      // Given
      const nullCtxRef = { current: null };

      // When
      const cleanup = animateDrawing(canvasRef, nullCtxRef, [], 40, false);

      // Then
      expect(cleanup).toBeInstanceOf(Function);
    });

    it('초기화 시 캔버스를 흰색으로 클리어해야 한다', () => {
      // Given
      const strokes: Stroke[] = [
        {
          points: [
            [10, 20],
            [30, 40],
          ],
          color: [0, 0, 0],
        },
      ];

      // When
      animateDrawing(canvasRef, ctxRef, strokes, 40, false);

      // Then
      expect(mockCtx.fillStyle).toBe('white');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 500, 500);
    });
  });

  describe('애니메이션 속도 제어', () => {
    it('speed=0일 때 매 프레임마다 점을 그려야 한다', () => {
      // Given
      const strokes: Stroke[] = [
        {
          points: [
            [10, 20, 30],
            [15, 25, 35],
          ],
          color: [255, 0, 0],
        },
      ];
      animateDrawing(canvasRef, ctxRef, strokes, 0, false);

      // When: Frame 1
      vi.advanceTimersByTime(16);
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 15);

      // When: Frame 2
      vi.advanceTimersByTime(16);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(20, 25);

      // When: Frame 3
      vi.advanceTimersByTime(16);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(30, 35);
    });

    it('speed > 0일 때 지정된 속도만큼 대기 후 점을 그려야 한다', () => {
      // Given
      const speed = 50;
      const strokes: Stroke[] = [
        {
          points: [
            [10, 20],
            [15, 25],
          ],
          color: [0, 255, 0],
        },
      ];
      animateDrawing(canvasRef, ctxRef, strokes, speed, false);

      // When: 첫 프레임 실행 직후
      vi.advanceTimersByTime(16);
      vi.advanceTimersByTime(30);
      // Then: 50ms 미만 경과 시점
      expect(mockCtx.beginPath).not.toHaveBeenCalled();

      // When: 총 71ms 경과 (speed 초과)
      vi.advanceTimersByTime(25);
      // Then
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 15);
    });
  });

  describe('스트로크 그리기', () => {
    it('단일 스트로크를 순서대로 그려야 한다', () => {
      // Given
      const strokes: Stroke[] = [
        {
          points: [
            [10, 20, 30],
            [15, 25, 35],
          ],
          color: [100, 150, 200],
        },
      ];
      animateDrawing(canvasRef, ctxRef, strokes, 0, false);

      // When: 첫 점
      vi.advanceTimersByTime(16);
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 15);
      expect(mockCtx.strokeStyle).toBe('rgb(100, 150, 200)');

      // When: 두 번째 점
      vi.advanceTimersByTime(16);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(20, 25);
      expect(mockCtx.stroke).toHaveBeenCalled();

      // When: 세 번째 점
      vi.advanceTimersByTime(16);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(30, 35);
    });

    it('여러 스트로크를 순서대로 그려야 한다', () => {
      // Given
      const strokes: Stroke[] = [
        {
          points: [
            [10, 20],
            [15, 25],
          ],
          color: [255, 0, 0],
        },
        {
          points: [
            [30, 40],
            [35, 45],
          ],
          color: [0, 255, 0],
        },
      ];
      animateDrawing(canvasRef, ctxRef, strokes, 0, false);

      // When & Then: 첫 번째 스트로크
      vi.advanceTimersByTime(16);
      expect(mockCtx.strokeStyle).toBe('rgb(255, 0, 0)');
      expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 15);

      vi.advanceTimersByTime(16);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(20, 25);

      // When & Then: 두 번째 스트로크 시작
      vi.advanceTimersByTime(16);
      expect(mockCtx.strokeStyle).toBe('rgb(0, 255, 0)');
      expect(mockCtx.moveTo).toHaveBeenCalledWith(30, 35);

      vi.advanceTimersByTime(16);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(40, 45);
    });

    it('color가 undefined일 때 기본 색상(검정)을 사용해야 한다', () => {
      // Given
      const strokes: Stroke[] = [
        {
          points: [
            [10, 20],
            [15, 25],
          ],
          color: undefined!,
        },
      ];
      animateDrawing(canvasRef, ctxRef, strokes, 0, false);

      // When
      vi.advanceTimersByTime(16);

      // Then
      expect(mockCtx.strokeStyle).toBe('rgb(0, 0, 0)');
    });
  });

  describe('루프 재생', () => {
    it('loop=false일 때 한 번만 그리고 끝나야 한다', () => {
      // Given
      const strokes: Stroke[] = [
        {
          points: [
            [10, 20],
            [15, 25],
          ],
          color: [0, 0, 0],
        },
      ];
      animateDrawing(canvasRef, ctxRef, strokes, 0, false);
      const mockFillRect = vi.mocked(mockCtx.fillRect!);
      const initialFillRectCalls = mockFillRect.mock.calls.length;

      // When: 그리기 완료 및 시간 경과
      vi.advanceTimersByTime(2100);

      // Then: 재시작(추가 fillRect)이 발생하지 않음
      expect(mockFillRect.mock.calls.length).toBe(initialFillRectCalls);
    });

    it('loop=true일 때 1초 대기 후 다시 그려야 한다', () => {
      // Given
      const strokes: Stroke[] = [
        {
          points: [
            [10, 20],
            [15, 25],
          ],
          color: [0, 0, 0],
        },
      ];
      animateDrawing(canvasRef, ctxRef, strokes, 0, true);
      const mockFillRect = vi.mocked(mockCtx.fillRect!);

      // When: 첫 그리기 완료 및 500ms 경과
      vi.advanceTimersByTime(100);
      vi.advanceTimersByTime(500);
      expect(mockFillRect.mock.calls.length).toBe(1);

      // When: 루프 딜레이(1초) 충족
      vi.advanceTimersByTime(600);

      // Then: 재시작 확인
      expect(mockFillRect.mock.calls.length).toBe(2);
      vi.advanceTimersByTime(16);
      expect(mockCtx.beginPath).toHaveBeenCalled();
    });
  });

  describe('cleanup 함수', () => {
    it('cleanup 호출 시 애니메이션이 중지되어야 한다', () => {
      // Given
      const strokes: Stroke[] = [
        {
          points: [
            [10, 20, 30],
            [15, 25, 35],
          ],
          color: [0, 0, 0],
        },
      ];
      const cleanup = animateDrawing(canvasRef, ctxRef, strokes, 0, false);

      // When: 시작 후 바로 중단
      vi.advanceTimersByTime(16);
      expect(mockCtx.moveTo).toHaveBeenCalledTimes(1);
      cleanup();

      // Then: 시간 경과 후에도 추가 그리기가 없음
      vi.advanceTimersByTime(1000);
      expect(mockCtx.moveTo).toHaveBeenCalledTimes(1);
    });

    it('cleanup을 여러 번 호출해도 에러가 발생하지 않아야 한다', () => {
      // Given
      const strokes: Stroke[] = [
        {
          points: [
            [10, 20],
            [15, 25],
          ],
          color: [0, 0, 0],
        },
      ];
      const cleanup = animateDrawing(canvasRef, ctxRef, strokes, 0, false);

      // When & Then
      expect(() => {
        cleanup();
        cleanup();
        cleanup();
      }).not.toThrow();
    });
  });
});
