import type { Stroke } from '@/entities/similarity';
import { drawStrokesOnCanvas } from '@/features/drawingCanvas/lib/drawStrokesOnCanvas';
import { CANVAS_CONFIG } from '@/shared/config';
import { useCanvasSetup } from '@/shared/model/useCanvasSetup';
import { useEffect } from 'react';

interface ImagePreviewCardProps {
  promptStrokes: Stroke[];
  label?: string;
}

export const ImagePreviewCard = ({
  promptStrokes,
  label,
}: ImagePreviewCardProps) => {
  const { canvasRef, ctxRef, isReady } = useCanvasSetup();

  useEffect(() => {
    if (isReady) {
      drawStrokesOnCanvas(canvasRef, ctxRef, promptStrokes ?? []);
    }
  }, [promptStrokes, isReady]);

  return (
    <div className="relative w-full max-w-2xl rounded-2xl border-4 border-gray-800 bg-white p-3 shadow-2xl">
      <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-lg bg-[#4a5f5a]">
        <canvas
          ref={canvasRef}
          width={CANVAS_CONFIG.width}
          height={CANVAS_CONFIG.height}
          className="h-full w-full"
        />

        {label && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border-2 border-gray-300 bg-white/90 px-4 py-1.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-gray-600">
                draw
              </span>
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
