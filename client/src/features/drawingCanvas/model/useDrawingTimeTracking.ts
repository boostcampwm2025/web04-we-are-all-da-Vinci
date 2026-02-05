import { useEffect, useRef } from 'react';
import { captureMessage } from '@/shared/lib/sentry';
import { trackEvent } from '@/shared/lib/mixpanel';
import { MIXPANEL_EVENTS } from '@/shared/config';

interface UseDrawingTimeTrackingProps {
  roomId: string | undefined;
  currentRound: number;
  drawingTime: number;
}

export const useDrawingTimeTracking = ({
  roomId,
  currentRound,
  drawingTime,
}: UseDrawingTimeTrackingProps) => {
  const totalDrawingTimeRef = useRef<number>(0);

  useEffect(() => {
    // Drawing phase 시작 시 총 그리기 시간 초기화
    totalDrawingTimeRef.current = 0;

    return () => {
      // 언마운트 시 그리기 시간이 있으면 Sentry에 전송
      if (totalDrawingTimeRef.current > 0) {
        const totalRoundTimeSec = drawingTime;
        const actualDrawingTimeSec = totalDrawingTimeRef.current / 1000;
        const thinkingTimeSec = totalRoundTimeSec - actualDrawingTimeSec;
        const drawingRatio = (actualDrawingTimeSec / totalRoundTimeSec) * 100;

        captureMessage('Drawing Time Check', 'info', {
          totalRoundTime: String(totalRoundTimeSec),
          actualDrawingTime: actualDrawingTimeSec.toFixed(2),
          waitingTime: thinkingTimeSec.toFixed(2),
          drawingRatio: drawingRatio.toFixed(1),
        });

        trackEvent(MIXPANEL_EVENTS.DRAWING_TIME, {
          총_제한시간: totalRoundTimeSec,
          실제_그리기시간: Number(actualDrawingTimeSec.toFixed(2)),
          대기시간: Number(thinkingTimeSec.toFixed(2)),
          그리기_비율: Number(drawingRatio.toFixed(1)),
          라운드: currentRound,
        });
      }
    };
  }, [currentRound, roomId, drawingTime]);

  // 스트로크 지속시간을 누적하는 핸들러
  const handleStrokeDuration = (duration: number) => {
    totalDrawingTimeRef.current += duration;
  };

  return { handleStrokeDuration };
};
