import { useRef, useState, useEffect } from 'react';

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<[number[], number[]] | null>(null); // 현재 그리고 있는 stroke
  const strokesRef = useRef<[number[], number[]][]>([]); // 모든 stroke

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'black';

    ctxRef.current = ctx;
  }, []);

  // 브라우저 마우스 좌표를 캔버스 내부 픽셀 좌표로 변환
  const getMousePosOnCanvas = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect(); // 캔버스의 화면 내 위치와 크기 가져오기
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
    if (!ctx) return;

    const { x, y } = getMousePosOnCanvas(e);
    if (!isDrawing) return;
    ctx.lineTo(x, y);
    ctx.stroke();

    currentStrokeRef.current?.[0].push(x);
    currentStrokeRef.current?.[1].push(y);
  };

  // 그리기 종료
  const handleMouseUp = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (!isDrawing) return;
    ctx.closePath();
    setIsDrawing(false);
    console.log('현재까지 그린 데이터:', strokesRef.current);
    // 현재 스트로크를 전체 스트로크에 저장
    if (currentStrokeRef.current) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
    }
  };

  // 마우스가 캔버스 밖으로 나갔을 때 그리기 종료
  const handleMouseOut = () => {
    if (isDrawing) handleMouseUp();
  };

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={500}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseOut={handleMouseOut}
    />
  );
}
