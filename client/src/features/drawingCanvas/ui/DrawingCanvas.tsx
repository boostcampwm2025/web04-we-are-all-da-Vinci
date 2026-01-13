import { useEffect, useRef } from 'react';
import { useCanvasSetup } from '@/shared/model/useCanvasSetup';
import { useMouseDrawing } from '@/features/drawingCanvas/model/useMouseDrawing';
import { useStrokes } from '@/features/drawingCanvas/model/useStrokes';
import { useColorSelection } from '@/features/drawingCanvas/model/useColorSelection';
import { DrawingToolbar } from '@/features/drawingToolbar/ui/DrawingToolbar';
import { CANVAS_CONFIG, SERVER_EVENTS, GAME_PHASE } from '@/shared/config';
import { drawStrokesOnCanvas } from '@/features/drawingCanvas/lib/drawStrokesOnCanvas';
import { useGameStore, selectPhase } from '@/entities/gameRoom/model';
import { calculateFinalSimilarity } from '@/features/similarity/lib';
import { getSocket } from '@/shared/api/socket';
import { captureEvent } from '@/shared/lib/sentry';

// 기본 그리기 기능을 제공하는 캔버스 컴포넌트
export const DrawingCanvas = () => {
  const { canvasRef, ctxRef } = useCanvasSetup();

  const { strokes, canUndo, handleAddStroke, handleClearStrokes, handleUndo } =
    useStrokes();
  const { selectedColor, handleColorSelect } = useColorSelection();

  const strokeCountRef = useRef(strokes.length);
  const totalDrawingTimeRef = useRef<number>(0);

  const phase = useGameStore(selectPhase);
  const promptStrokes = useGameStore((state) => state.promptStrokes);
  const roomId = useGameStore((state) => state.roomId);
  const currentRound = useGameStore((state) => state.currentRound);
  const settings = useGameStore((state) => state.settings);

  // 라운드 시작/종료 처리
  useEffect(() => {
    if (phase === GAME_PHASE.DRAWING) {
      // 라운드 시작 시 총 그리기 시간 초기화
      totalDrawingTimeRef.current = 0;
    }

    if (phase !== GAME_PHASE.DRAWING && totalDrawingTimeRef.current > 0) {
      // 라운드 종료 시 총 그리기 시간을 Sentry에 전송
      const totalRoundTimeSec = settings.drawingTime;
      const thinkingTimeSec =
        totalRoundTimeSec - totalDrawingTimeRef.current / 1000;
      const drawingRatio =
        (totalDrawingTimeRef.current / 1000 / totalRoundTimeSec) * 100;

      captureEvent(
        'Drawing Round Completed',
        'info',
        {
          round: String(currentRound),
          roomId,
        },
        {
          totalRoundTimeSec,
          actualDrawingTimeMs: totalDrawingTimeRef.current,
          thinkingTimeSec: thinkingTimeSec.toFixed(2),
          drawingRatio: drawingRatio.toFixed(1),
        },
      );

      totalDrawingTimeRef.current = 0;
    }
  }, [phase, currentRound, roomId, settings.drawingTime]);

  // strokes가 변경될 때마다 유사도 계산 및 점수 전송
  useEffect(() => {
    try {
      const similarity = calculateFinalSimilarity(promptStrokes, strokes);

      // 서버에 점수 전송
      const socket = getSocket();

      socket.emit(SERVER_EVENTS.USER_SCORE, {
        roomId,
        similarity: similarity.similarity,
      });
    } catch (error) {
      console.error('Failed to calculate/send similarity:', error);
    }

    // strokes 길이가 줄어들 때는 캔버스 다시 그리기 (undo/clear)
    if (strokes.length < strokeCountRef.current) {
      drawStrokesOnCanvas(canvasRef, ctxRef, strokes);
    }

    strokeCountRef.current = strokes.length;
  }, [strokes, phase, promptStrokes, roomId, canvasRef, ctxRef]);

  // 스트로크 지속시간을 누적하는 핸들러
  const handleStrokeDuration = (duration: number) => {
    totalDrawingTimeRef.current += duration;
  };

  const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseOut } =
    useMouseDrawing({
      canvasRef,
      ctxRef,
      selectedColor,
      onAddStroke: handleAddStroke,
      onStrokeDuration: handleStrokeDuration,
    });

  return (
    <div className="flex aspect-square w-full flex-col overflow-hidden rounded-2xl border-4 border-gray-800 bg-white shadow-2xl">
      <DrawingToolbar
        onColorSelect={handleColorSelect}
        onUndo={handleUndo}
        onClear={handleClearStrokes}
        canUndo={canUndo}
      />
      <div className="relative aspect-square w-full bg-white">
        <canvas
          ref={canvasRef}
          width={CANVAS_CONFIG.width}
          height={CANVAS_CONFIG.height}
          className="h-full w-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseOut={handleMouseOut}
        />
      </div>
    </div>
  );
};
