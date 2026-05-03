import type { SimilarityResponse, Stroke } from "@toss/shared";
import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeStrokes } from "../lib/normalizeStrokes";

const DEFAULT_CANVAS_SIZE = 500;

export interface UseDrawingSubmitParams {
  promptId: number;
  anonymousHash: string;
  strokes: Stroke[];
  similarity: SimilarityResponse | null;
}

export interface UseDrawingSubmitResult {
  handleSubmit: () => void;
}

export const useDrawingSubmit = ({
  promptId,
  anonymousHash,
  strokes,
  similarity,
}: UseDrawingSubmitParams): UseDrawingSubmitResult => {
  const navigate = useNavigate();
  const hasSubmittedRef = useRef(false);

  const argsRef = useRef({ promptId, anonymousHash, strokes, similarity });
  argsRef.current = { promptId, anonymousHash, strokes, similarity };

  const handleSubmit = useCallback(() => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    const current = argsRef.current;

    const canvasEl = document.querySelector<HTMLCanvasElement>(
      '[data-testid="drawing-canvas"]',
    );
    const canvasSize =
      canvasEl && canvasEl.width > 0
        ? canvasEl.width / (window.devicePixelRatio || 1)
        : DEFAULT_CANVAS_SIZE;
    const normalizedStrokes = normalizeStrokes(current.strokes, canvasSize);

    navigate("/submitted", {
      state: {
        promptId: current.promptId,
        strokes: normalizedStrokes,
        similarity: current.similarity,
        anonymousHash: current.anonymousHash,
      },
      replace: true,
    });
  }, [navigate]);

  return { handleSubmit };
};
