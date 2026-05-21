import type { Stroke } from "@toss/shared";
import { useCanvasSetup } from "../hooks/useCanvasSetup";
import { useDrawingReplay } from "../hooks/useDrawingReplay";

interface ReplayDrawingCanvasProps {
  strokes: Stroke[];
  speed?: number;
  loop?: boolean;
  ariaLabel?: string;
}

const ReplayDrawingCanvas = ({
  strokes,
  speed = 0,
  loop = true,
  ariaLabel,
}: ReplayDrawingCanvasProps) => {
  const { containerRef, canvasRef, ctxRef, canvasSize } = useCanvasSetup();

  useDrawingReplay({
    canvasRef,
    ctxRef,
    strokes,
    speed,
    loop,
    canvasSize,
  });

  return (
    <div
      ref={containerRef}
      className="flex w-full items-center justify-center rounded-(--radius-inner) bg-(--color-card) shadow-sm"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        className="rounded-(--radius-inner)"
      />
    </div>
  );
};
export default ReplayDrawingCanvas;
