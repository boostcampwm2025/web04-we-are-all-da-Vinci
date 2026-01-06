import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import { CANVAS_STYLES } from '@/shared/config';

interface UseDrawingOptions {
  canvasRef: RefObject<HTMLCanvasElement>;
  ctxRef: RefObject<CanvasRenderingContext2D>;
  onAddStroke?: (stroke: Stroke) => void; // stroke 추가 시 호출
  onClearStrokes?: () => void; // strokes 초기화 시 호출
}

// TODO : 미지가 추가해준 타입 파일에서 가져오기로 수정!
interface Stroke {
  points: [number[], number[]];
  color: [number, number, number];
}

// 캔버스 그리기 기능을 제공하는 훅
// 마우스 이벤트를 처리하고 완성된 스트로크를 콜백으로 전달
export const useDrawing = ({
  canvasRef,
  ctxRef,
  onAddStroke,
  onClearStrokes,
}: UseDrawingOptions) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<[number[], number[]] | null>(null);

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

    currentStrokeRef.current = [[x], [y]];
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

    if (currentStrokeRef.current) {
      const newStroke: Stroke = {
        points: currentStrokeRef.current,
        color: [0, 0, 0], // TODO: 색상 기능 추가 시 수정 필요
      };

      // stroke 추가 콜백 호출
      onAddStroke?.(newStroke);
      currentStrokeRef.current = null;
    }
  };

  // 마우스가 캔버스 밖으로 나갔을 때 그리기 종료
  const handleMouseOut = () => {
    if (isDrawing) handleMouseUp();
  };

  // 캔버스 초기화 (화면 + 상태)
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    // 화면 지우기
    ctx.fillStyle = CANVAS_STYLES.fillStyle;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    currentStrokeRef.current = null;

    // strokes 초기화 콜백 호출
    onClearStrokes?.();
  };

  return {
    isDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseOut,
    clearCanvas,
  };
};
