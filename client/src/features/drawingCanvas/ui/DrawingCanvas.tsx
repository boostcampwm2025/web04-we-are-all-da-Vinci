import { useEffect, useMemo, useRef } from 'react';
import { useCanvasSetup } from '@/shared/model/useCanvasSetup';
import { useMouseDrawing } from '@/features/drawingCanvas/model/useMouseDrawing';
import { useStrokes } from '@/features/drawingCanvas/model/useStrokes';
import { useColorSelection } from '@/features/drawingCanvas/model/useColorSelection';
import { DrawingToolbar } from '@/features/drawingToolbar/ui/DrawingToolbar';
import { CANVAS_CONFIG, SERVER_EVENTS } from '@/shared/config';
import { drawStrokesOnCanvas } from '@/features/drawingCanvas/lib/drawStrokesOnCanvas';
import { useGameStore, selectPhase } from '@/entities/gameRoom/model';
import { getSocket } from '@/shared/api/socket';
import {
  calculateFinalSimilarityByPreprocessed,
  preprocessStrokes,
} from '@/features/similarity/lib';

// 기본 그리기 기능을 제공하는 캔버스 컴포넌트
export const DrawingCanvas = () => {
  const { canvasRef, ctxRef } = useCanvasSetup();

  const { strokes, canUndo, handleAddStroke, handleClearStrokes, handleUndo } =
    useStrokes();
  const { selectedColor, handleColorSelect } = useColorSelection();

  const strokeCountRef = useRef(strokes.length);

  const phase = useGameStore(selectPhase);
  const promptStrokes = useGameStore((state) => state.promptStrokes);
  const roomId = useGameStore((state) => state.roomId);
  const timer = useGameStore((state) => state.timer);
  const currentRound = useGameStore((state) => state.currentRound);

  // 제출 상태 추적용 ref
  const isSubmittedRef = useRef(false);
  const hasTimerStartedRef = useRef(false);

  // 라운드/페이즈 변경 시 ref 초기화
  useEffect(() => {
    isSubmittedRef.current = false;
    hasTimerStartedRef.current = false;
  }, [currentRound, phase]);

  // promptStrokes 전처리 (제시 그림이 바뀌지 않으면 캐시된 값 사용)
  const preprocessedPrompt = useMemo(() => {
    if (promptStrokes.length === 0) return null;
    return preprocessStrokes(promptStrokes);
  }, [promptStrokes]);

  // playerStrokes 전처리 (strokes가 변경될 때마다 재계산)
  const preprocessedPlayer = useMemo(() => {
    return preprocessStrokes(strokes);
  }, [strokes]);

  // timer가 0이 되면 자동 제출
  useEffect(() => {
    // 타이머가 시작되었는지 확인 (0보다 큰 값이 들어오면 시작된 것으로 간주)
    if (timer > 0) {
      hasTimerStartedRef.current = true;
    }

    // 타이머가 시작된 적이 있고, 0이 되면 제출
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
      drawStrokesOnCanvas(canvasRef, ctxRef, strokes);
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

  const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseOut } =
    useMouseDrawing({
      canvasRef,
      ctxRef,
      selectedColor,
      onAddStroke: handleAddStroke,
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
