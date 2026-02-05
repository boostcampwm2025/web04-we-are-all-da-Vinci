import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureMessage } from '@/shared/lib/sentry';
import { trackEvent } from '@/shared/lib/mixpanel';
import { MIXPANEL_EVENTS } from '@/shared/config';
import { useDrawingTimeTracking } from './useDrawingTimeTracking';

// Mock dependencies
vi.mock('@/shared/lib/sentry', () => ({
  captureMessage: vi.fn(),
}));

vi.mock('@/shared/lib/mixpanel', () => ({
  trackEvent: vi.fn(),
}));

describe('useDrawingTimeTracking', () => {
  const defaultProps = {
    roomId: 'room-1',
    currentRound: 1,
    drawingTime: 60,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('언마운트 시 그리기 활동이 있었다면 로그를 전송해야 한다', () => {
    const { result, unmount } = renderHook(() =>
      useDrawingTimeTracking(defaultProps),
    );

    // Simulate drawing activity (adding duration)
    // 10 seconds of drawing
    act(() => {
      result.current.handleStrokeDuration(10000);
    });

    unmount();

    expect(captureMessage).toHaveBeenCalledWith(
      'Drawing Time Check',
      'info',
      expect.any(Object),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      MIXPANEL_EVENTS.DRAWING_TIME,
      expect.objectContaining({
        총_제한시간: 60,
        실제_그리기시간: 10,
        대기시간: 50, // 60 - 10
        그리기_비율: expect.any(Number),
        라운드: 1,
      }),
    );
  });

  it('그리기 활동이 없었다면 로그를 전송하지 않는다', () => {
    const { unmount } = renderHook(() => useDrawingTimeTracking(defaultProps));

    // No drawing duration added

    unmount();

    expect(captureMessage).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('라운드나 방이 변경되면 축적된 시간이 초기화되어야 한다', () => {
    const { result, rerender, unmount } = renderHook(
      (props) => useDrawingTimeTracking(props),
      { initialProps: defaultProps },
    );

    act(() => {
      result.current.handleStrokeDuration(5000);
    });

    // Change round
    rerender({ ...defaultProps, currentRound: 2 });

    // Should not send logs for the previous round automatically on update (depends on implementation, but typically we want it on unmount or specific cleanup)
    // IMPORTANT: The original implementation in DrawingCanvas.tsx resets `totalDrawingTimeRef.current = 0` on dependency change.
    // If we want to capture data PER ROUND, the original code actually might have missed "unmount-like" effect when deps change unless the component remounts.
    // Actually, `useEffect` cleanup runs when deps change. So it SHOULD send logs when round changes.

    // Let's verify if the cleanup function of the FIRST render effect runs.
    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledTimes(1);

    // Clear mocks to check next behavior
    vi.clearAllMocks();

    // Now accumulate time for round 2
    act(() => {
      result.current.handleStrokeDuration(3000);
    });

    unmount();

    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(
      MIXPANEL_EVENTS.DRAWING_TIME,
      expect.objectContaining({
        실제_그리기시간: 3,
        라운드: 2,
      }),
    );
  });
});
