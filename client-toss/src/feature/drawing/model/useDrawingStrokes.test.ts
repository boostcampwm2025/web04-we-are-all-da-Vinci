import type { Stroke } from "@toss/shared";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDrawingStrokes } from "./useDrawingStrokes";

const makeStroke = (x = 0): Stroke => ({
  points: [
    [x, x + 1],
    [x, x + 1],
  ],
  color: [0, 0, 0],
});

const makeCallbacks = () => ({
  onScoreImmediate: vi.fn(),
  onScoreDebounced: vi.fn(),
  onCancelScore: vi.fn(),
  onResetScore: vi.fn(),
});

describe("useDrawingStrokes", () => {
  it("초기 strokes는 빈 배열이다", () => {
    const { result } = renderHook(() => useDrawingStrokes(makeCallbacks()));
    expect(result.current.strokes).toEqual([]);
  });

  it("handleAddStroke로 stroke를 추가하면 배열에 누적된다", () => {
    const { result } = renderHook(() => useDrawingStrokes(makeCallbacks()));

    act(() => {
      result.current.handleAddStroke(makeStroke(0));
    });
    expect(result.current.strokes).toHaveLength(1);

    act(() => {
      result.current.handleAddStroke(makeStroke(2));
    });
    expect(result.current.strokes).toHaveLength(2);
  });

  it("stroke 추가 시 onScoreDebounced 콜백이 호출된다", () => {
    const callbacks = makeCallbacks();
    const { result } = renderHook(() => useDrawingStrokes(callbacks));

    act(() => {
      result.current.handleAddStroke(makeStroke(0));
    });

    expect(callbacks.onScoreDebounced).toHaveBeenCalledOnce();
    expect(callbacks.onScoreDebounced).toHaveBeenCalledWith([makeStroke(0)]);
  });

  it("strokes가 비어있을 때는 onScoreDebounced가 호출되지 않는다", () => {
    const callbacks = makeCallbacks();
    renderHook(() => useDrawingStrokes(callbacks));

    expect(callbacks.onScoreDebounced).not.toHaveBeenCalled();
  });

  it("handleUndo는 마지막 stroke를 제거하고 onScoreImmediate를 즉시 호출한다", () => {
    const callbacks = makeCallbacks();
    const { result } = renderHook(() => useDrawingStrokes(callbacks));

    act(() => {
      result.current.handleAddStroke(makeStroke(0));
      result.current.handleAddStroke(makeStroke(2));
    });

    callbacks.onScoreImmediate.mockClear();
    callbacks.onCancelScore.mockClear();

    act(() => {
      result.current.handleUndo();
    });

    expect(result.current.strokes).toHaveLength(1);
    expect(callbacks.onCancelScore).toHaveBeenCalledOnce();
    expect(callbacks.onScoreImmediate).toHaveBeenCalledOnce();
    expect(callbacks.onScoreImmediate).toHaveBeenCalledWith([makeStroke(0)]);
  });

  it("handleClear는 strokes를 비우고 onCancelScore + onResetScore를 호출한다", () => {
    const callbacks = makeCallbacks();
    const { result } = renderHook(() => useDrawingStrokes(callbacks));

    act(() => {
      result.current.handleAddStroke(makeStroke(0));
      result.current.handleAddStroke(makeStroke(2));
    });

    callbacks.onCancelScore.mockClear();
    callbacks.onResetScore.mockClear();

    act(() => {
      result.current.handleClear();
    });

    expect(result.current.strokes).toEqual([]);
    expect(callbacks.onCancelScore).toHaveBeenCalledOnce();
    expect(callbacks.onResetScore).toHaveBeenCalledOnce();
  });
});
