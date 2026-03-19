import { useEffect, useRef } from 'react';
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
      // 언마운트 시 그리기 시간이 있으면 Mixpanel에 전송
      // drawingTime === 0이면 division-by-zero 방지를 위해 전송하지 않음
      if (totalDrawingTimeRef.current > 0 && drawingTime > 0) {
        try {
          const totalRoundTimeSec = drawingTime;
          const actualDrawingTimeSec = totalDrawingTimeRef.current / 1000;
          const thinkingTimeSec = totalRoundTimeSec - actualDrawingTimeSec;
          const drawingRatio = (actualDrawingTimeSec / totalRoundTimeSec) * 100;

          trackEvent(MIXPANEL_EVENTS.DRAWING_TIME, {
            총_제한시간: totalRoundTimeSec,
            실제_그리기시간: Number(actualDrawingTimeSec.toFixed(2)),
            대기시간: Number(thinkingTimeSec.toFixed(2)),
            그리기_비율: Number(drawingRatio.toFixed(1)),
            라운드: currentRound,
          });
        } catch {
          // Mixpanel 전송 실패는 게임 진행에 영향을 주지 않으므로 무시
        }
      }
    };
  }, [currentRound, roomId, drawingTime]);

  // 스트로크 지속시간을 누적하는 핸들러
  const handleStrokeDuration = (duration: number) => {
    totalDrawingTimeRef.current += duration;
  };

  return { handleStrokeDuration };
};
