import { useRef, useEffect, useState } from 'react';
import { CANVAS_STYLES } from '@/shared/config';

interface CanvasSetupOptions {
  fillStyle?: string;
  strokeStyle?: string;
  lineWidth?: number;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
}

// 캔버스 초기화를 위한 공통 훅
// 캔버스 요소와 컨텍스트를 초기 설정과 함께 제공
export const useCanvasSetup = (options: CanvasSetupOptions = {}) => {
  const {
    fillStyle = CANVAS_STYLES.fillStyle,
    strokeStyle = CANVAS_STYLES.strokeStyle,
    lineWidth = CANVAS_STYLES.lineWidth,
    lineCap = CANVAS_STYLES.lineCap,
    lineJoin = CANVAS_STYLES.lineJoin,
  } = options;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 배경 채우기 (초기화)
    ctx.fillStyle = fillStyle;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 선 스타일 초기 설정
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = lineCap;
    ctx.lineJoin = lineJoin;

    ctxRef.current = ctx;
    setIsReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 초기화는 1회만 실행, 이후 색깔, 선 스타일 변경은 ctxRef.current로 직접 수정

  return { canvasRef, ctxRef, isReady };
};
