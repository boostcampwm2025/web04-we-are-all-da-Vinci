import { useEffect, useMemo, useRef } from 'react';
import { useCanvasSetup } from '@/shared/model/useCanvasSetup';
import { useMouseDrawing } from '@/features/drawingCanvas/model/useMouseDrawing';
import { useStrokes } from '@/features/drawingCanvas/model/useStrokes';
import { useColorSelection } from '@/features/drawingCanvas/model/useColorSelection';
import { DrawingToolbar } from '@/features/drawingToolbar/ui/DrawingToolbar';
import { CANVAS_CONFIG, SERVER_EVENTS } from '@/shared/config';
import { drawStrokesOnCanvas } from '@/entities/drawing/lib/drawStrokesOnCanvas';
import { useGameStore, selectPhase } from '@/entities/gameRoom/model';
import { getSocket } from '@/shared/api/socket';
import {
  calculateFinalSimilarityByPreprocessed,
  preprocessStrokes,
} from '@/features/similarity/lib';
import { captureMessage } from '@/shared/lib/sentry';

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
  const timer = useGameStore((state) => state.timer);
  const currentRound = useGameStore((state) => state.currentRound);
  const settings = useGameStore((state) => state.settings);

  // 제출 상태 추적용 ref
  const isSubmittedRef = useRef(false);
  const hasTimerStartedRef = useRef(false);

  // 컴포넌트 언마운트 시 Drawing time을 Sentry에 전송
  useEffect(() => {
    // Drawing phase 시작 시 총 그리기 시간 초기화
    totalDrawingTimeRef.current = 0;
    isSubmittedRef.current = false;
    hasTimerStartedRef.current = false;

    return () => {
      // 언마운트 시 그리기 시간이 있으면 Sentry에 전송
      if (totalDrawingTimeRef.current > 0) {
        const totalRoundTimeSec = settings.drawingTime;
        const actualDrawingTimeSec = totalDrawingTimeRef.current / 1000;
        const thinkingTimeSec = totalRoundTimeSec - actualDrawingTimeSec;
        const drawingRatio = (actualDrawingTimeSec / totalRoundTimeSec) * 100;

        captureMessage('Drawing Time Check', 'info', {
          totalRoundTime: String(totalRoundTimeSec),
          actualDrawingTime: actualDrawingTimeSec.toFixed(2),
          waitingTime: thinkingTimeSec.toFixed(2),
          drawingRatio: drawingRatio.toFixed(1),
        });
      }
    };
  }, [currentRound, roomId, settings.drawingTime]);

  // promptStrokes 전처리 (제시 그림이 바뀌지 않으면 캐시된 값 사용)
  const preprocessedPrompt = useMemo(() => {
    if (promptStrokes.length === 0) return null;
    return preprocessStrokes(promptStrokes);
  }, [promptStrokes]);

  // playerStrokes 전처리 (strokes가 변경될 때마다 재계산)
  const preprocessedPlayer = useMemo(() => {
    return preprocessStrokes(strokes);
  }, [strokes]);

  useEffect(() => {
    if (timer > 0) {
      hasTimerStartedRef.current = true;
    }
    if (
      phase === 'DRAWING' &&
      timer === 0 &&
      hasTimerStartedRef.current &&
      !isSubmittedRef.current &&
      preprocessedPrompt
    ) {
      isSubmittedRef.current = true;
      const similarity = calculateFinalSimilarityByPreprocessed(
        preprocessedPrompt,
        preprocessedPlayer,
      );

      captureMessage(
        'Drawing Data',
        'info',
        {
          roomId,
        },
        {
          strokesData: JSON.stringify(strokes),
        },
      );

      getSocket().emit(SERVER_EVENTS.USER_DRAWING, {
        roomId,
        strokes,
        similarity: similarity.similarity,
      });
    }
  }, [timer, phase, preprocessedPrompt, preprocessedPlayer, strokes, roomId]);

  // strokes가 변경될 때마다 유사도 계산 및 점수 전송
  useEffect(() => {
    try {
      if (!preprocessedPrompt) return;

      const similarity = calculateFinalSimilarityByPreprocessed(
        preprocessedPrompt,
        preprocessedPlayer,
      );

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
      drawStrokesOnCanvas(canvasRef, ctxRef, strokes, false);
    }

    strokeCountRef.current = strokes.length;
  }, [
    strokes,
    phase,
    preprocessedPrompt,
    preprocessedPlayer,
    roomId,
    canvasRef,
    ctxRef,
  ]);

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
