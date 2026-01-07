import { useCanvasSetup } from '@/shared/model/useCanvasSetup';
import { useMouseDrawing } from '../model/useMouseDrawing';
import { DrawingToolbar } from '@/features/drawingToolbar';
import { useStrokes } from '../model/useStrokes';
import { CANVAS_CONFIG } from '@/shared/config';

// 드로잉 툴바와 캔버스를 조합한 완전한 캔버스 컴포넌트
// strokes 상태 관리 및 툴바-캔버스 간 연동 처리
export const DrawingCanvas = () => {
  const {
    // selectedColor, // TODO: 색상 기능 구현 시 사용
    canUndo,
    handleAddStroke,
    handleClearStrokes,
    handleUndo,
    setSelectedColor,
  } = useStrokes();

  const { canvasRef, ctxRef } = useCanvasSetup();

  const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseOut } =
    useMouseDrawing({
      canvasRef,
      ctxRef,
      onAddStroke: handleAddStroke,
    });

  // TODO: useStrokes에서 strokes에 대한 undo와 클리어 기능을 제공중, 이걸 캔버스 화면에도 반영해야 함
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border-4 border-gray-800 bg-white shadow-2xl">
      <DrawingToolbar
        onColorSelect={setSelectedColor}
        onUndo={handleUndo}
        onClear={handleClearStrokes}
        canUndo={canUndo}
      />
      <div className="relative min-h-0 flex-1 bg-white">
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
