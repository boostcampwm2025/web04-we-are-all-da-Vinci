import type { Stroke } from '@/entities/similarity/model';
import { drawStrokesOnCanvas } from '@/features/drawingCanvas/lib/drawStrokesOnCanvas';
import { CANVAS_CONFIG } from '@/shared/config';
import { useCanvasSetup } from '@/shared/model/useCanvasSetup';
import { useEffect } from 'react';

interface PromptSectionProps {
  promptStrokes: Stroke[];
}

export const PromptSection = ({ promptStrokes }: PromptSectionProps) => {
  const { canvasRef, ctxRef } = useCanvasSetup();

  useEffect(() => {
    drawStrokesOnCanvas(canvasRef, ctxRef, promptStrokes);
  }, [promptStrokes]);

  return (
    <div className="flex w-1/3 flex-col">
      <div className="mb-2 flex shrink-0 items-center gap-1.5">
        <span className="material-symbols-outlined text-base text-yellow-500">
          image
        </span>
        <h2 className="font-handwriting text-xl font-bold text-gray-800">
          제시된 그림
        </h2>
      </div>
      <div className="flex flex-col overflow-hidden rounded-xl border-4 border-yellow-300 bg-white p-2 shadow-xl">
        <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-50">
          <canvas
            ref={canvasRef}
            width={CANVAS_CONFIG.width}
            height={CANVAS_CONFIG.height}
            className="h-full w-full rounded-lg border-2 border-gray-300"
          />
        </div>
      </div>
    </div>
  );
};
