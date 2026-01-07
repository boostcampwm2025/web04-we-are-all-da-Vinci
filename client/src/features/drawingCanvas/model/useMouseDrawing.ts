import { useState } from 'react';
import type { RefObject } from 'react';

interface UseMouseDrawingOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  ctxRef: RefObject<CanvasRenderingContext2D | null>;
}

// 마우스 이벤트로 캔버스에 그리는 기능을 제공하는 훅
export const useMouseDrawing = ({
  canvasRef,
  ctxRef,
}: UseMouseDrawingOptions) => {
  const [isDrawing, setIsDrawing] = useState(false);

  // 브라우저 마우스 좌표를 캔버스 내부 픽셀 좌표로 변환
  const getMousePosOnCanvas = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // 그리기 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const { x, y } = getMousePosOnCanvas(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  // 그리기 진행
  const handleMouseMove = (e: React.MouseEvent) => {
    const ctx = ctxRef.current;
    if (!ctx || !isDrawing) return;

    const { x, y } = getMousePosOnCanvas(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // 그리기 종료
  const handleMouseUp = () => {
    const ctx = ctxRef.current;
    if (!ctx || !isDrawing) return;

    ctx.closePath();
    setIsDrawing(false);
  };

  // 마우스가 캔버스 밖으로 나갔을 때 그리기 종료
  const handleMouseOut = () => {
    if (isDrawing) handleMouseUp();
  };

  return {
    isDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseOut,
  };
};
