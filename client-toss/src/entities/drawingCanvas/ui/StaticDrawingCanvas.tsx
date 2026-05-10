import type { Stroke } from "@toss/shared";
import { useEffect } from "react";
import { useCanvasSetup } from "../hooks/useCanvasSetup";
import { drawPromptOnCanvas } from "../lib/drawPromptOnCanvas";
import { drawStrokesOnCanvas } from "../lib/drawStrokesOnCanvas";

interface StaticDrawingCanvasProps {
  strokes: Stroke[];
  /** true면 strokes를 캔버스 영역에 맞춰 스케일링 (prompt 데이터처럼 normalized 좌표일 때) */
  isPrompt?: boolean;
  ariaLabel?: string;
}

const StaticDrawingCanvas = ({
  strokes,
  isPrompt = false,
  ariaLabel,
}: StaticDrawingCanvasProps) => {
  const { containerRef, canvasRef, ctxRef, canvasSize } = useCanvasSetup();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || canvasSize === 0) return;

    if (isPrompt) {
      drawPromptOnCanvas(canvas, ctx, strokes);
    } else {
      drawStrokesOnCanvas(canvas, ctx, strokes, false);
    }
  }, [canvasRef, ctxRef, strokes, isPrompt, canvasSize]);

  return (
    <div
      ref={containerRef}
      className="flex w-full items-center justify-center rounded-xl bg-white shadow-sm"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        className="rounded-xl"
      />
    </div>
  );
};
export default StaticDrawingCanvas;
