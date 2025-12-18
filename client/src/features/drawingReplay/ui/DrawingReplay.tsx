import { useEffect, useRef, useState } from 'react';
import type { Stroke } from '@/entities/drawing/model/types';

interface DrawingReplayProps {
  strokes: Stroke[];
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  replaySpeed?: number;
  loop?: boolean;
  onReplayComplete?: () => void;
}

const DrawingReplay = ({
  strokes,
  width = 500,
  height = 500,
  strokeColor = 'black',
  strokeWidth = 3,
  replaySpeed = 3,
  loop = true,
  onReplayComplete,
}: DrawingReplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReplaying, setIsReplaying] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 설정
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;

    // 애니메이션 상태
    let strokeIndex = 0;
    let pointIndex = 0;
    let lastTime = 0;
    let animationId: number | null = null;

    setIsReplaying(true);

    const animate = (timestamp: number) => {
      // 속도 제어
      if (timestamp - lastTime < replaySpeed) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      lastTime = timestamp;

      // 모든 획 완료
      if (strokeIndex >= strokes.length) {
        if (loop) {
          ctx.clearRect(0, 0, width, height);
          strokeIndex = 0;
          pointIndex = 0;
          onReplayComplete?.();
        } else {
          setIsReplaying(false);
          onReplayComplete?.();
          return;
        }
      }

      const stroke = strokes[strokeIndex];
      const [xCoords, yCoords] = stroke;

      // 획 시작
      if (pointIndex === 0) {
        ctx.beginPath();
        ctx.moveTo(xCoords[0], yCoords[0]);
        pointIndex++;
      }
      // 점 그리기
      else if (pointIndex < xCoords.length) {
        ctx.lineTo(xCoords[pointIndex], yCoords[pointIndex]);
        ctx.stroke();
        pointIndex++;
      }
      // 다음 획으로
      else {
        strokeIndex++;
        pointIndex = 0;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [
    strokes,
    width,
    height,
    strokeColor,
    strokeWidth,
    replaySpeed,
    loop,
    onReplayComplete,
  ]);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: '1px solid #ccc',
          borderRadius: '8px',
          backgroundColor: 'white',
        }}
      />
      {isReplaying && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          재생 중...
        </div>
      )}
    </div>
  );
};

export default DrawingReplay;
