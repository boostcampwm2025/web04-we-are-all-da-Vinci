import { serverTossApi } from "@/shared/api";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStrokeScoring } from "./useStrokeScoring";

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    scoreStrokes: vi.fn(),
  },
}));

const mockedScoreStrokes = vi.mocked(serverTossApi.scoreStrokes);
const mockedHaptic = vi.mocked(generateHapticFeedback);

const makeStroke = (): Stroke => ({
  points: [
    [0, 1],
    [0, 1],
  ],
  color: [0, 0, 0],
});

const makeSimilarity = (value: number): SimilarityResponse => ({
  score: value,
  shapeSimilarity: value,
  strokeMatchSimilarity: value,
  penalty: 0,
});

describe("useStrokeScoring", () => {
  beforeEach(() => {
    mockedScoreStrokes.mockReset();
    mockedHaptic.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("빈 stroke 배열을 전달하면 API를 호출하지 않고 similarity를 null로 설정한다", async () => {
    const { result } = renderHook(() => useStrokeScoring());

    await act(async () => {
      await result.current.scoreStrokes([]);
    });

    expect(mockedScoreStrokes).not.toHaveBeenCalled();
    expect(result.current.similarity).toBeNull();
  });

  it("stroke가 있을 때 scoreStrokes를 호출하면 API 결과로 similarity가 갱신된다", async () => {
    mockedScoreStrokes.mockResolvedValueOnce(makeSimilarity(80));
    const { result } = renderHook(() => useStrokeScoring());

    await act(async () => {
      await result.current.scoreStrokes([makeStroke()]);
    });

    expect(mockedScoreStrokes).toHaveBeenCalledOnce();
    expect(result.current.similarity?.score).toBe(80);
  });

  it("scheduleScore는 100ms 디바운스 후 한 번만 API를 호출한다", async () => {
    vi.useFakeTimers();
    mockedScoreStrokes.mockResolvedValue(makeSimilarity(50));
    const { result } = renderHook(() => useStrokeScoring());

    act(() => {
      result.current.scheduleScore([makeStroke()]);
    });
    expect(mockedScoreStrokes).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(mockedScoreStrokes).toHaveBeenCalledOnce();
  });

  it("scheduleScore가 연속 호출되면 마지막 호출만 실행된다", async () => {
    vi.useFakeTimers();
    mockedScoreStrokes.mockResolvedValue(makeSimilarity(50));
    const { result } = renderHook(() => useStrokeScoring());

    act(() => {
      result.current.scheduleScore([makeStroke()]);
      result.current.scheduleScore([makeStroke(), makeStroke()]);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(mockedScoreStrokes).toHaveBeenCalledOnce();
    expect(mockedScoreStrokes).toHaveBeenCalledWith({
      strokes: [makeStroke(), makeStroke()],
    });
  });

  it("cancelPendingScore 호출 후에는 디바운스된 호출이 실행되지 않는다", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStrokeScoring());

    act(() => {
      result.current.scheduleScore([makeStroke()]);
      result.current.cancelPendingScore();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(mockedScoreStrokes).not.toHaveBeenCalled();
  });

  it("이전 similarity보다 점수가 떨어지면 showPenalty가 true가 되고 햅틱이 호출된다", async () => {
    mockedScoreStrokes
      .mockResolvedValueOnce(makeSimilarity(80))
      .mockResolvedValueOnce(makeSimilarity(60));

    const { result } = renderHook(() => useStrokeScoring());

    await act(async () => {
      await result.current.scoreStrokes([makeStroke()]);
    });
    expect(result.current.showPenalty).toBe(false);

    await act(async () => {
      await result.current.scoreStrokes([makeStroke(), makeStroke()]);
    });

    expect(result.current.showPenalty).toBe(true);
    expect(mockedHaptic).toHaveBeenCalledWith({ type: "error" });
  });

  it("점수가 떨어진 후 400ms가 지나면 showPenalty가 false로 돌아온다", async () => {
    mockedScoreStrokes
      .mockResolvedValueOnce(makeSimilarity(80))
      .mockResolvedValueOnce(makeSimilarity(60));

    const { result } = renderHook(() => useStrokeScoring());

    await act(async () => {
      await result.current.scoreStrokes([makeStroke()]);
    });
    await act(async () => {
      await result.current.scoreStrokes([makeStroke(), makeStroke()]);
    });
    expect(result.current.showPenalty).toBe(true);

    await waitFor(() => {
      expect(result.current.showPenalty).toBe(false);
    });
  });

  it("resetSimilarity를 호출하면 similarity가 null이 된다", async () => {
    mockedScoreStrokes.mockResolvedValueOnce(makeSimilarity(80));
    const { result } = renderHook(() => useStrokeScoring());

    await act(async () => {
      await result.current.scoreStrokes([makeStroke()]);
    });
    expect(result.current.similarity).not.toBeNull();

    act(() => {
      result.current.resetSimilarity();
    });
    expect(result.current.similarity).toBeNull();
  });
});
