import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Stroke, Color } from '@/entities/similarity/model';

interface UseMouseDrawingOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  ctxRef: RefObject<CanvasRenderingContext2D | null>;
  selectedColor: Color;
  onAddStroke?: (stroke: Stroke) => void; // 그리기 완료 시 완성된 stroke 전달
  onStrokeDuration?: (duration: number) => void; // 스트로크 지속시간 콜백
}

// 마우스 이벤트로 캔버스에 그리는 기능을 제공하는 훅
// 마우스 이벤트를 처리하고 완성된 스트로크를 콜백으로 전달
export const useMouseDrawing = ({
  canvasRef,
  ctxRef,
  selectedColor,
  onAddStroke,
  onStrokeDuration,
}: UseMouseDrawingOptions) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<[number[], number[]] | null>(null);
  const strokeStartTimeRef = useRef<number | null>(null);

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

    // 선 색상 설정
    ctx.strokeStyle = `rgb(${selectedColor[0]}, ${selectedColor[1]}, ${selectedColor[2]})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);

    currentStrokeRef.current = [[x], [y]];
    strokeStartTimeRef.current = performance.now();
  };

  // 그리기 진행
  const handleMouseMove = (e: React.MouseEvent) => {
    const ctx = ctxRef.current;
    if (!ctx || !isDrawing) return;

    const { x, y } = getMousePosOnCanvas(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    currentStrokeRef.current?.[0].push(x);
    currentStrokeRef.current?.[1].push(y);
  };

  // 그리기 종료
  const handleMouseUp = () => {
    const ctx = ctxRef.current;
    if (!ctx || !isDrawing) return;

    ctx.closePath();
    setIsDrawing(false);

    if (currentStrokeRef.current && strokeStartTimeRef.current !== null) {
      const strokeDuration = performance.now() - strokeStartTimeRef.current;

      const newStroke: Stroke = {
        points: currentStrokeRef.current,
        color: selectedColor,
      };

      // stroke 추가 콜백 호출
      onAddStroke?.(newStroke);

      // 스트로크 지속시간 콜백 호출
      onStrokeDuration?.(strokeDuration);

      currentStrokeRef.current = null;
      strokeStartTimeRef.current = null;
    }
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
