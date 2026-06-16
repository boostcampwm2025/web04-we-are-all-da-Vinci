import type { Stroke } from "@toss/shared";
import { useEffect, type RefObject } from "react";
import { animateDrawing } from "../lib/animateDrawing";

interface UseDrawingReplayProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  ctxRef: RefObject<CanvasRenderingContext2D | null>;
  strokes: Stroke[];
  speed: number;
  loop: boolean;
  targetDurationMs?: number;
  /**
   * 캔버스 사이즈 변화에 맞춰 리플레이 재시작 트리거.
   * useCanvasSetup의 canvasSize 값을 그대로 넘기면 됨.
   */
  canvasSize?: number;
}

export const useDrawingReplay = ({
  canvasRef,
  ctxRef,
  strokes,
  speed,
  loop,
  targetDurationMs,
  canvasSize = 0,
}: UseDrawingReplayProps) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    if (!canvas || !ctx || strokes.length === 0 || canvasSize === 0) {
      return;
    }

    const cancelAnimation = animateDrawing(
      canvasRef,
      ctxRef,
      strokes,
      speed,
      loop,
      targetDurationMs,
    );

    return () => {
      cancelAnimation();
    };
  }, [canvasRef, ctxRef, strokes, speed, loop, targetDurationMs, canvasSize]);
};
