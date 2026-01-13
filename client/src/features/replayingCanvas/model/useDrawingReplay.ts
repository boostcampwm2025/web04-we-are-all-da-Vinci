import type { Stroke } from '@/entities/similarity/model';
import { useEffect, type RefObject } from 'react';
import { animateDrawing } from '../lib/animateDrawing';

interface UseDrawingReplayProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  ctxRef: RefObject<CanvasRenderingContext2D | null>;
  strokes: Stroke[];
  speed: number;
  loop: boolean;
}

export const useDrawingReplay = ({
  canvasRef,
  ctxRef,
  strokes,
  speed,
  loop,
}: UseDrawingReplayProps) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    if (!canvas || !ctx || strokes.length === 0) {
      return;
    }

    const cancelAnimation = animateDrawing(
      canvasRef,
      ctxRef,
      strokes,
      speed,
      loop,
    );

    return () => {
      cancelAnimation();
    };
  }, [canvasRef, ctxRef, strokes, speed, loop]);
};
