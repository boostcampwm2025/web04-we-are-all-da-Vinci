import { useEffect, useMemo, useRef } from 'react';
import { getSocket } from '@/shared/api';
import { SERVER_EVENTS, type Phase } from '@/shared/config';
import { captureMessage } from '@/shared/lib/sentry';
import type { Stroke } from '@/entities/similarity';
import {
  calculateFinalSimilarityByPreprocessed,
  preprocessStrokes,
} from '@/features/similarity';
import { drawStrokesOnCanvas } from '@/entities/drawing';

interface UseDrawingSubmissionProps {
  strokes: Stroke[];
  promptStrokes: Stroke[] | null | undefined;
  isPractice: boolean;
  roomId: string;
  timer: number;
  phase: Phase;
  currentRound: number;
  onSimilarityChange?: (similarity: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  ctxRef: React.RefObject<CanvasRenderingContext2D | null>;
}

export const useDrawingSubmission = ({
  strokes,
  promptStrokes,
  isPractice,
  roomId,
  timer,
  phase,
  currentRound,
  onSimilarityChange,
  canvasRef,
  ctxRef,
}: UseDrawingSubmissionProps) => {
  const strokeCountRef = useRef(strokes.length);

  // 제출 상태 추적용 ref
  const isSubmittedRef = useRef(false);
  const hasTimerStartedRef = useRef(false);

  useEffect(() => {
    isSubmittedRef.current = false;
    hasTimerStartedRef.current = false;
  }, [currentRound]);

  // promptStrokes 전처리 (제시 그림이 바뀌지 않으면 캐시된 값 사용)
  const preprocessedPrompt = useMemo(() => {
    if (!promptStrokes || promptStrokes.length === 0) return null;
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
      preprocessedPrompt &&
      !isPractice
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
        similarity,
      });
    }
  }, [
    timer,
    phase,
    preprocessedPrompt,
    preprocessedPlayer,
    strokes,
    roomId,
    canvasRef,
    ctxRef,
    isPractice,
  ]);

  // strokes가 변경될 때마다 유사도 계산 및 점수 전송
  useEffect(() => {
    try {
      if (!preprocessedPrompt) return;

      const similarity = calculateFinalSimilarityByPreprocessed(
        preprocessedPrompt,
        preprocessedPlayer,
      );

      if (isPractice) {
        onSimilarityChange?.(similarity.similarity);
      } else {
        const socket = getSocket();
        socket.emit(SERVER_EVENTS.USER_SCORE, {
          roomId,
          similarity: similarity.similarity,
        });
      }
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
    preprocessedPrompt,
    preprocessedPlayer,
    roomId,
    isPractice,
    onSimilarityChange,
  ]);
};
