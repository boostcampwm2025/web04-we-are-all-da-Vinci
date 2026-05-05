import { act, renderHook } from "@testing-library/react";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDrawingSubmit } from "./useDrawingSubmit";

const navigateMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("../lib/normalizeStrokes", () => ({
  normalizeStrokes: vi.fn((strokes: Stroke[], canvasSize: number) => {
    return strokes.map((s) => ({
      ...s,
      _normalizedWith: canvasSize,
    }));
  }),
}));

const makeStroke = (): Stroke => ({
  points: [
    [0, 1],
    [0, 1],
  ],
  color: [0, 0, 0],
});

const makeSimilarity = (value: number): SimilarityResponse => ({
  score: value,
  strokeMatchSimilarity: value,
  shapeSimilarity: value,
  penalty: 0,
});

const baseParams = {
  promptId: 42,
  anonymousHash: "hash-abc",
  strokes: [makeStroke()],
  similarity: makeSimilarity(70),
};

describe("useDrawingSubmit", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("handleSubmit이 호출되면 /submitted 경로로 이동한다", () => {
    const { result } = renderHook(() => useDrawingSubmit(baseParams));

    act(() => {
      result.current.handleSubmit();
    });

    expect(navigateMock).toHaveBeenCalledOnce();
    expect(navigateMock).toHaveBeenCalledWith(
      "/submitted",
      expect.objectContaining({ replace: true }),
    );
  });

  it("route state의 promptId, anonymousHash, similarity가 navigate state에 포함된다", () => {
    const { result } = renderHook(() => useDrawingSubmit(baseParams));

    act(() => {
      result.current.handleSubmit();
    });

    const [, options] = navigateMock.mock.calls[0];
    expect(options.state).toMatchObject({
      promptId: 42,
      anonymousHash: "hash-abc",
      similarity: makeSimilarity(70),
    });
  });

  it("handleSubmit이 두 번 호출되어도 navigate는 한 번만 실행된다", () => {
    const { result } = renderHook(() => useDrawingSubmit(baseParams));

    act(() => {
      result.current.handleSubmit();
      result.current.handleSubmit();
    });

    expect(navigateMock).toHaveBeenCalledOnce();
  });

  it("canvas 요소가 없으면 기본 size 500으로 정규화한다", () => {
    const { result } = renderHook(() => useDrawingSubmit(baseParams));

    act(() => {
      result.current.handleSubmit();
    });

    const [, options] = navigateMock.mock.calls[0];
    expect(options.state.strokes[0]).toMatchObject({ _normalizedWith: 500 });
  });

  it("canvas가 있으면 width/devicePixelRatio로 정규화한다", () => {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("data-testid", "drawing-canvas");
    canvas.width = 800;
    document.body.appendChild(canvas);
    vi.stubGlobal("devicePixelRatio", 2);

    const { result } = renderHook(() => useDrawingSubmit(baseParams));

    act(() => {
      result.current.handleSubmit();
    });

    const [, options] = navigateMock.mock.calls[0];
    expect(options.state.strokes[0]).toMatchObject({ _normalizedWith: 400 });
  });

  it("canvas는 있지만 width가 0이면 기본 size 500으로 정규화한다", () => {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("data-testid", "drawing-canvas");
    canvas.width = 0;
    document.body.appendChild(canvas);

    const { result } = renderHook(() => useDrawingSubmit(baseParams));

    act(() => {
      result.current.handleSubmit();
    });

    const [, options] = navigateMock.mock.calls[0];
    expect(options.state.strokes[0]).toMatchObject({ _normalizedWith: 500 });
  });
});
