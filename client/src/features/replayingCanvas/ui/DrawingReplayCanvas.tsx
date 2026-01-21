import type { Stroke } from '@/entities/similarity/model';
import { CANVAS_CONFIG } from '@/shared/config';
import { useDrawingReplay } from '../model/useDrawingReplay';
import { useCanvasSetup } from '@/shared/model';

interface DrawingReplayCanvasProps {
  strokes: Stroke[];
  speed?: number;
  loop?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export const DrawingReplayCanvas = ({
  strokes,
  speed = 40,
  loop = true,
  width = CANVAS_CONFIG.width,
  height = CANVAS_CONFIG.height,
  className = '',
}: DrawingReplayCanvasProps) => {
  const { canvasRef, ctxRef } = useCanvasSetup();

  useDrawingReplay({
    canvasRef,
    ctxRef,
    strokes,
    speed,
    loop,
  });

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
};
