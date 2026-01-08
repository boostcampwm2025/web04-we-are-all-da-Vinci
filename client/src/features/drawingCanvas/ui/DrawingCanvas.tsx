import { useEffect, useRef } from 'react';
import { useCanvasSetup } from '@/shared/model/useCanvasSetup';
import { useMouseDrawing } from '@/features/drawingCanvas/model/useMouseDrawing';
import { useStrokes } from '@/features/drawingCanvas/model/useStrokes';
import { useColorSelection } from '@/features/drawingCanvas/model/useColorSelection';
import { DrawingToolbar } from '@/features/drawingToolbar/ui/DrawingToolbar';
import { CANVAS_CONFIG, SERVER_EVENTS } from '@/shared/config';
import { drawStrokesOnCanvas } from '@/features/drawingCanvas/lib/drawStrokesOnCanvas';
import { useGameStore, selectPhase } from '@/entities/gameRoom/model';
import { calculateFinalSimilarity } from '@/features/similarity/lib';
import { getSocket } from '@/shared/api/socket';

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

  // strokes가 변경될 때마다 유사도 계산 및 점수 전송
  useEffect(() => {
    try {
      console.log(promptStrokes);
      console.log(strokes);
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
