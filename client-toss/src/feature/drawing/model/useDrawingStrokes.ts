import type { Stroke } from "@toss/shared";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseDrawingStrokesParams {
  onScoreImmediate: (strokes: Stroke[]) => void;
  onScoreDebounced: (strokes: Stroke[]) => void;
  onCancelScore: () => void;
  onResetScore: () => void;
}

export interface UseDrawingStrokesResult {
  strokes: Stroke[];
  handleAddStroke: (stroke: Stroke) => void;
  handleUndo: () => void;
  handleClear: () => void;
}

export const useDrawingStrokes = ({
  onScoreImmediate,
  onScoreDebounced,
  onCancelScore,
  onResetScore,
}: UseDrawingStrokesParams): UseDrawingStrokesResult => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  const callbacksRef = useRef({
    onScoreImmediate,
    onScoreDebounced,
    onCancelScore,
    onResetScore,
  });
  callbacksRef.current = {
    onScoreImmediate,
    onScoreDebounced,
    onCancelScore,
    onResetScore,
  };

  useEffect(() => {
    if (strokes.length === 0) return;
    callbacksRef.current.onScoreDebounced(strokes);
  }, [strokes]);

  const handleAddStroke = useCallback((stroke: Stroke) => {
    setStrokes((prev) => [...prev, stroke]);
  }, []);

  const handleUndo = useCallback(() => {
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      callbacksRef.current.onCancelScore();
      callbacksRef.current.onScoreImmediate(next);
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
    callbacksRef.current.onCancelScore();
    callbacksRef.current.onResetScore();
  }, []);

  return { strokes, handleAddStroke, handleUndo, handleClear };
};
