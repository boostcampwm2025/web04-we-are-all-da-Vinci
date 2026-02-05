import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDrawingSubmission } from './useDrawingSubmission';
import { getSocket } from '@/shared/api';
import { GAME_PHASE, SERVER_EVENTS } from '@/shared/config';
import {
  calculateFinalSimilarityByPreprocessed,
  preprocessStrokes,
} from '@/features/similarity';
import { drawStrokesOnCanvas } from '@/entities/drawing';
import { MOCK_STROKES } from '@/test/mocks/mockStrokes';
import type { Stroke } from '@/entities/similarity';
import { MOCK_SIMILARITY } from '@/test/mocks/mockData';

vi.mock('@/shared/api', () => ({
  getSocket: vi.fn(),
}));

vi.mock('@/features/similarity', () => ({
  calculateFinalSimilarityByPreprocessed: vi.fn(),
  preprocessStrokes: vi.fn(),
}));

vi.mock('@/entities/drawing', () => ({
  drawStrokesOnCanvas: vi.fn(),
}));

vi.mock('@/shared/lib/sentry', () => ({
  captureMessage: vi.fn(),
}));

describe('useDrawingSubmission', () => {
  const mockEmit = vi.fn();
  const mockCanvasRef = { current: document.createElement('canvas') };
  const mockCtxRef = { current: mockCanvasRef.current.getContext('2d') };
  const mockOnSimilarityChange = vi.fn();

  const defaultProps = {
    strokes: [] as Stroke[],
    promptStrokes: MOCK_STROKES,
    isPractice: false,
    roomId: 'test-room',
    timer: 10,
    phase: GAME_PHASE.DRAWING,
    currentRound: 1,
    onSimilarityChange: mockOnSimilarityChange,
    canvasRef: mockCanvasRef,
    ctxRef: mockCtxRef,
  };

  const SAMPLE_STROKES: Stroke[] = [{ points: [[10], [10]], color: [0, 0, 0] }];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSocket).mockReturnValue({ emit: mockEmit } as never);
    vi.mocked(preprocessStrokes).mockImplementation(
      (strokes: Stroke[]) => strokes,
    );
    vi.mocked(calculateFinalSimilarityByPreprocessed).mockReturnValue(
      MOCK_SIMILARITY,
    );
  });

  it('DRAWING 단계이고 타이머가 0일 때 제출되어야 한다', () => {
    // 1. Initial render with timer > 0
    const { rerender } = renderHook((props) => useDrawingSubmission(props), {
      initialProps: { ...defaultProps, timer: 5 },
    });

    // 2. Rerender with timer = 0 AND changed strokes (simulating last second drawing)
    const newStrokes = SAMPLE_STROKES;
    rerender({ ...defaultProps, timer: 0, strokes: newStrokes });

    // 3. Verify submission
    // USER_SCORE might be called first if strokes changed, but we verify USER_DRAWING is called with correct params
    expect(mockEmit).toHaveBeenCalledWith(SERVER_EVENTS.USER_DRAWING, {
      roomId: 'test-room',
      strokes: newStrokes,
      similarity: MOCK_SIMILARITY,
    });
  });

  it('연습모드일 때 최종 제출되지 않아야 한다', () => {
    const practiceProps = { ...defaultProps, isPractice: true, timer: 5 };

    // 1. Initial render
    const { rerender } = renderHook((props) => useDrawingSubmission(props), {
      initialProps: practiceProps,
    });

    // 2. Rerender with timer = 0
    rerender({ ...practiceProps, timer: 0 });

    // 3. Verify NO submission
    expect(mockEmit).not.toHaveBeenCalledWith(
      SERVER_EVENTS.USER_DRAWING,
      expect.anything(),
    );
  });

  it('stroke가 변경될 때마다 유사도가 계산되어야 한다', () => {
    const { rerender } = renderHook((props) => useDrawingSubmission(props), {
      initialProps: defaultProps,
    });

    // Change strokes
    const newStrokes = SAMPLE_STROKES;
    rerender({ ...defaultProps, strokes: newStrokes });

    // Verify calculation
    expect(calculateFinalSimilarityByPreprocessed).toHaveBeenCalled();
    // Verify emission (since isPractice is false)
    expect(mockEmit).toHaveBeenCalledWith(SERVER_EVENTS.USER_SCORE, {
      roomId: 'test-room',
      similarity: MOCK_SIMILARITY.similarity,
    });
  });

  it('연습 모드에서 stroke가 변경되면 emit 하는 대신 onSimilarityChange가 호출되어야 한다', () => {
    const practiceProps = { ...defaultProps, isPractice: true };
    const { rerender } = renderHook((props) => useDrawingSubmission(props), {
      initialProps: practiceProps,
    });

    // Change strokes
    const newStrokes = SAMPLE_STROKES;
    rerender({ ...practiceProps, strokes: newStrokes });

    // Verify calculation
    expect(calculateFinalSimilarityByPreprocessed).toHaveBeenCalled();

    // Verify NO emission
    expect(mockEmit).not.toHaveBeenCalledWith(
      SERVER_EVENTS.USER_SCORE,
      expect.anything(),
    );

    // Verify callback
    expect(mockOnSimilarityChange).toHaveBeenCalledWith(
      MOCK_SIMILARITY.similarity,
    );
  });

  it('stroke 길이가 줄어들면(실행 취소) 유사도가 재계산되고 캔버스가 다시 그려져야 한다', () => {
    const initialStrokes = [
      {
        points: [
          [1, 2],
          [1, 2],
        ],
        color: [0, 0, 0],
      },
      { points: [[3], [3]], color: [0, 0, 0] },
    ] as Stroke[]; // 2 strokes
    const { rerender } = renderHook((props) => useDrawingSubmission(props), {
      initialProps: { ...defaultProps, strokes: initialStrokes },
    });

    // Decrease strokes (undo)
    const reducedStrokes = [
      {
        points: [
          [1, 2],
          [1, 2],
        ],
        color: [0, 0, 0],
      },
    ] as Stroke[]; // 1 stroke
    rerender({ ...defaultProps, strokes: reducedStrokes });

    // Verify redraw
    expect(drawStrokesOnCanvas).toHaveBeenCalledWith(
      mockCanvasRef,
      mockCtxRef,
      reducedStrokes,
      false,
    );

    // Verify similarity calculation happens as well
    expect(calculateFinalSimilarityByPreprocessed).toHaveBeenCalled();
  });
});
