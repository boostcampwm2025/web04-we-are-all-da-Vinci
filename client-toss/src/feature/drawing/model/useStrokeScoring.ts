import { serverTossApi } from "@/shared/api";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PENALTY_DURATION_MS,
  SCORE_DEBOUNCE_MS,
  TREND_HOLD_MS,
  TREND_THRESHOLD,
  type ScoreTrend,
} from "../config/scoring";

export interface UseStrokeScoringResult {
  similarity: SimilarityResponse | null;
  showPenalty: boolean;
  trend: ScoreTrend;
  scoreStrokes: (strokes: Stroke[]) => Promise<void>;
  scheduleScore: (strokes: Stroke[]) => void;
  cancelPendingScore: () => void;
  resetSimilarity: () => void;
}

export const useStrokeScoring = (): UseStrokeScoringResult => {
  const [similarity, setSimilarity] = useState<SimilarityResponse | null>(null);
  const [showPenalty, setShowPenalty] = useState(false);
  const [trend, setTrend] = useState<ScoreTrend>(null);

  const similarityRef = useRef<SimilarityResponse | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const penaltyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    similarityRef.current = similarity;
  }, [similarity]);

  const cancelPendingScore = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const resetSimilarity = useCallback(() => {
    requestIdRef.current++;
    setSimilarity(null);
    setShowPenalty(false);
    setTrend(null);
    if (penaltyTimeoutRef.current) {
      clearTimeout(penaltyTimeoutRef.current);
      penaltyTimeoutRef.current = null;
    }
    if (trendTimeoutRef.current) {
      clearTimeout(trendTimeoutRef.current);
      trendTimeoutRef.current = null;
    }
  }, []);

  const triggerPenalty = useCallback(() => {
    generateHapticFeedback({ type: "error" });
    setShowPenalty(true);
    if (penaltyTimeoutRef.current) clearTimeout(penaltyTimeoutRef.current);
    penaltyTimeoutRef.current = setTimeout(() => {
      setShowPenalty(false);
    }, PENALTY_DURATION_MS);
  }, []);

  const updateTrend = useCallback((diff: number) => {
    if (Math.abs(diff) < TREND_THRESHOLD) return;
    setTrend(diff > 0 ? "up" : "down");
    if (trendTimeoutRef.current) clearTimeout(trendTimeoutRef.current);
    trendTimeoutRef.current = setTimeout(() => {
      setTrend(null);
    }, TREND_HOLD_MS);
  }, []);

  const scoreStrokes = useCallback(
    async (targetStrokes: Stroke[]) => {
      const id = ++requestIdRef.current;
      if (targetStrokes.length === 0) {
        setSimilarity(null);
        return;
      }
      try {
        const result = await serverTossApi.scoreStrokes({
          strokes: targetStrokes,
        });
        if (id !== requestIdRef.current) return;
        const prev = similarityRef.current;
        if (prev) {
          if (result.score < prev.score) triggerPenalty();
          updateTrend(result.score - prev.score);
        }
        setSimilarity(result);
      } catch {
        // 스코어링 실패 시 무시
      }
    },
    [triggerPenalty, updateTrend],
  );

  const scheduleScore = useCallback(
    (targetStrokes: Stroke[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        scoreStrokes(targetStrokes);
      }, SCORE_DEBOUNCE_MS);
    },
    [scoreStrokes],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (penaltyTimeoutRef.current) clearTimeout(penaltyTimeoutRef.current);
      if (trendTimeoutRef.current) clearTimeout(trendTimeoutRef.current);
    };
  }, []);

  return {
    similarity,
    showPenalty,
    trend,
    scoreStrokes,
    scheduleScore,
    cancelPendingScore,
    resetSimilarity,
  };
};
