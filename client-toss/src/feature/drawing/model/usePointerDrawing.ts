import type { Stroke } from "@toss/shared";
import { useRef, useState } from "react";
import type { RGB } from "../config/colors";

interface UsePointerDrawingOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  ctxRef: React.RefObject<CanvasRenderingContext2D | null>;
  selectedColor: RGB;
  onAddStroke: (stroke: Stroke) => void;
}

export const usePointerDrawing = ({
  canvasRef,
  ctxRef,
  selectedColor,
  onAddStroke,
}: UsePointerDrawingOptions) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<[number[], number[]] | null>(null);

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x:
        (e.clientX - rect.left) *
        (canvas.width / rect.width / (window.devicePixelRatio || 1)),
      y:
        (e.clientY - rect.top) *
        (canvas.height / rect.height / (window.devicePixelRatio || 1)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const { x, y } = getPos(e);

    ctx.strokeStyle = `rgb(${selectedColor[0]}, ${selectedColor[1]}, ${selectedColor[2]})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    currentStrokeRef.current = [[x], [y]];
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const ctx = ctxRef.current;
    if (!ctx || !isDrawing) return;

    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    currentStrokeRef.current?.[0].push(x);
    currentStrokeRef.current?.[1].push(y);
  };

  const handlePointerUp = () => {
    const ctx = ctxRef.current;
    if (!ctx || !isDrawing) return;

    ctx.closePath();
    setIsDrawing(false);

    if (currentStrokeRef.current) {
      onAddStroke({
        points: currentStrokeRef.current,
        color: [...selectedColor],
      });
      currentStrokeRef.current = null;
    }
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};
