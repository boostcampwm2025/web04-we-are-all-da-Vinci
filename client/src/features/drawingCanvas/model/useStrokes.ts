import { useState } from 'react';
import type { Stroke } from '@/entities/similarity';
import { captureEvent } from '@/shared/lib/sentry';

// strokes 배열을 관리하는 훅
// 그리기 상태와 이를 조작하는 함수들 제공
export const useStrokes = () => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  // 새로운 stroke 추가
  const handleAddStroke = (stroke: Stroke) => {
    setStrokes((prev) => [...prev, stroke]);
  };

  // 모든 strokes 초기화
  const handleClearStrokes = () => {
    setStrokes([]);
    captureEvent('캔버스 초기화 이벤트 발생', 'info', {
      action: 'clear_strokes',
    });
  };

  // undo 기능 (마지막 stroke 제거)
  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
    captureEvent('캔버스 되돌리기 이벤트 발생', 'info', {
      action: 'undo_strokes',
    });
  };

  return {
    strokes, // 화면 갱신을 위해 strokes 배열 노출
    canUndo: strokes.length > 0,
    handleAddStroke,
    handleClearStrokes,
    handleUndo,
  };
};
