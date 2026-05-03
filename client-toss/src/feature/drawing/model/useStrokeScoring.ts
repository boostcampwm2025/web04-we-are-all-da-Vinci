import { serverTossApi } from "@/shared/api";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { useCallback, useEffect, useRef, useState } from "react";

const SCORE_DEBOUNCE_MS = 100;
const PENALTY_DURATION_MS = 400;

export interface UseStrokeScoringResult {
  similarity: SimilarityResponse | null;
  showPenalty: boolean;
  scoreStrokes: (strokes: Stroke[]) => Promise<void>;
  scheduleScore: (strokes: Stroke[]) => void;
  cancelPendingScore: () => void;
  resetSimilarity: () => void;
}

export const useStrokeScoring = (): UseStrokeScoringResult => {
  const [similarity, setSimilarity] = useState<SimilarityResponse | null>(null);
  const [showPenalty, setShowPenalty] = useState(false);

  const similarityRef = useRef<SimilarityResponse | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const penaltyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setSimilarity(null);
  }, []);

  const scoreStrokes = useCallback(async (targetStrokes: Stroke[]) => {
    if (targetStrokes.length === 0) {
      setSimilarity(null);
      return;
    }
    try {
      const result = await serverTossApi.scoreStrokes({
        strokes: targetStrokes,
      });
      const prev = similarityRef.current;
      if (prev && result.score < prev.score) {
        generateHapticFeedback({ type: "error" });
        setShowPenalty(true);
        if (penaltyTimeoutRef.current) {
          clearTimeout(penaltyTimeoutRef.current);
        }
        penaltyTimeoutRef.current = setTimeout(() => {
          setShowPenalty(false);
        }, PENALTY_DURATION_MS);
      }
      setSimilarity(result);
    } catch {
      // 스코어링 실패 시 무시
    }
  }, []);

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
    };
  }, []);

  return {
    similarity,
    showPenalty,
    scoreStrokes,
    scheduleScore,
    cancelPendingScore,
    resetSimilarity,
  };
};
