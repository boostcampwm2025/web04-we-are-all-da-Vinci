import type { Stroke } from '@/entities/similarity';
import { selectPhase, useGameStore } from '@/entities/gameRoom';
import { useColorSelection } from '@/features/drawingCanvas/model/useColorSelection';
import { useMouseDrawing } from '@/features/drawingCanvas/model/useMouseDrawing';
import { useStrokes } from '@/features/drawingCanvas/model/useStrokes';
import { useDrawingTimeTracking } from '@/features/drawingCanvas/model/useDrawingTimeTracking';
import { useDrawingSubmission } from '@/features/drawingCanvas/model/useDrawingSubmission';
import { DrawingToolbar } from '@/features/drawingToolbar';
import { useCanvasSetup } from '@/shared/model';
import { CANVAS_CONFIG } from '@/shared/config';

interface DrawingCanvasProps {
  isPractice?: boolean;
  practicePrompt?: Stroke[] | null;
  onSimilarityChange?: (similarity: number) => void;
}

// 기본 그리기 기능을 제공하는 캔버스 컴포넌트
export const DrawingCanvas = ({
  isPractice = false,
  practicePrompt,
  onSimilarityChange,
}: DrawingCanvasProps) => {
  const { canvasRef, ctxRef } = useCanvasSetup();

  const { strokes, canUndo, handleAddStroke, handleClearStrokes, handleUndo } =
    useStrokes();
  const { selectedColor, handleColorSelect } = useColorSelection();

  const phase = useGameStore(selectPhase);
  const storedPromptStrokes = useGameStore((state) => state.promptStrokes);
  const promptStrokes = isPractice ? practicePrompt : storedPromptStrokes;
  const roomId = useGameStore((state) => state.roomId);
  const timer = useGameStore((state) => state.timer);
  const currentRound = useGameStore((state) => state.currentRound);
  const settings = useGameStore((state) => state.settings);

  const { handleStrokeDuration } = useDrawingTimeTracking({
    roomId,
    currentRound,
    drawingTime: settings.drawingTime,
  });

  useDrawingSubmission({
    strokes,
    promptStrokes,
    isPractice,
    roomId: roomId!,
    timer,
    phase,
    currentRound,
    onSimilarityChange,
    canvasRef,
    ctxRef,
  });

  const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseOut } =
    useMouseDrawing({
      canvasRef,
      ctxRef,
      selectedColor,
      onAddStroke: handleAddStroke,
      onStrokeDuration: handleStrokeDuration,
    });

  return (
    <div className="canvas-main">
      <DrawingToolbar
        onColorSelect={handleColorSelect}
        onUndo={handleUndo}
        onClear={handleClearStrokes}
        canUndo={canUndo}
        selectedColor={selectedColor}
      />
      <div className="relative aspect-square w-full bg-white">
        <canvas
          ref={canvasRef}
          width={CANVAS_CONFIG.width}
          height={CANVAS_CONFIG.height}
          className="h-full w-full"
          style={{
            cursor: 'url(/cursors/pencil.png), auto',
            touchAction: 'none',
          }}
          onPointerDown={handleMouseDown}
          onPointerMove={handleMouseMove}
          onPointerUp={handleMouseUp}
          onMouseOut={handleMouseOut}
        />
      </div>
    </div>
  );
};
