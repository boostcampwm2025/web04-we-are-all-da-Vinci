import type { Stroke } from '@/entities/similarity/model';
import { drawStrokesOnCanvas } from '../lib/drawStrokesOnCanvas';
import { CANVAS_CONFIG } from '@/shared/config';
import { useEffect } from 'react';
import { useCanvasSetup } from '@/shared/model';

interface StaticCanvasProps {
  strokes: Stroke[];
  className?: string;
}

export const StaticCanvas = ({
  strokes,
  className = '',
}: StaticCanvasProps) => {
  const { canvasRef, ctxRef, isReady } = useCanvasSetup();

  useEffect(() => {
    if (isReady) {
      drawStrokesOnCanvas(canvasRef, ctxRef, strokes);
    }
  }, [strokes, isReady]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_CONFIG.width}
      height={CANVAS_CONFIG.height}
      className={`h-full w-full ${className}`}
    />
  );
};
