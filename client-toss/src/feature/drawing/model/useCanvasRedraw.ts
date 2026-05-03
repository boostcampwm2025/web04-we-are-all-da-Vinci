import type { Stroke } from "@toss/shared";
import { useEffect } from "react";
import { drawStrokesOnCanvas } from "../lib/drawStrokesOnCanvas";

export const useCanvasRedraw = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  ctxRef: React.RefObject<CanvasRenderingContext2D | null>,
  strokes: Stroke[],
) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    drawStrokesOnCanvas(canvas, ctx, strokes, false);
  }, [canvasRef, ctxRef, strokes]);
};
