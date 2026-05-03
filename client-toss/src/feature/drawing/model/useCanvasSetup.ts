import { useCallback, useEffect, useRef, useState } from "react";

export const useCanvasSetup = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [canvasSize, setCanvasSize] = useState(0);

  const initCanvas = useCallback((size: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const physicalSize = Math.round(size * dpr);

    // canvas.width 재설정은 항상 캔버스를 초기화하므로, 같은 크기면 스킵
    if (canvas.width === physicalSize && canvas.height === physicalSize) {
      setCanvasSize(size);
      return;
    }

    canvas.width = physicalSize;
    canvas.height = physicalSize;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, size, size);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctxRef.current = ctx;
    setCanvasSize(size);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      const size = Math.floor(width);
      if (size > 0) initCanvas(size);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [initCanvas]);

  return { containerRef, canvasRef, ctxRef, canvasSize };
};
