import type { Stroke } from "@toss/shared";
import type { RGB } from "../config/colors";
import { useCanvasRedraw } from "../model/useCanvasRedraw";
import { useCanvasSetup } from "../model/useCanvasSetup";
import { usePointerDrawing } from "../model/usePointerDrawing";

interface CanvasProps {
  selectedColor: RGB;
  strokes: Stroke[];
  onAddStroke: (stroke: Stroke) => void;
}

const Canvas = ({ selectedColor, strokes, onAddStroke }: CanvasProps) => {
  const { containerRef, canvasRef, ctxRef } = useCanvasSetup();

  useCanvasRedraw(canvasRef, ctxRef, strokes);

  const { handlePointerDown, handlePointerMove, handlePointerUp } =
    usePointerDrawing({
      canvasRef,
      ctxRef,
      selectedColor,
      onAddStroke,
    });

  return (
    <section className="min-h-0 flex-1 px-3 pb-3">
      <div
        ref={containerRef}
        className="flex aspect-square w-full items-center justify-center rounded-xl bg-white shadow-sm"
      >
        <canvas
          ref={canvasRef}
          data-testid="drawing-canvas"
          className="rounded-xl"
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    </section>
  );
};

export default Canvas;
