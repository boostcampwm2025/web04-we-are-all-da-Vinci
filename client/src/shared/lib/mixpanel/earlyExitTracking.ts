import { MIXPANEL_EVENTS } from '@/shared/config';
import { trackEvent, trackEventBeacon } from './index';

// JS 번들이 실행된 시점 (= navigation start 기준 경과 시간)
// performance.now()는 navigation start를 0으로 하는 상대 시간이므로
// 별도 기준 시간 없이 그대로 사용 가능
let homePageRendered = false;
let exitEventFired = false;

/**
 * Home 페이지가 브라우저에 paint된 후 호출.
 * useEffect 내에서 호출하면 React가 paint 완료 후 실행을 보장함.
 */
export const markHomePageRendered = () => {
  if (homePageRendered) return;
  homePageRendered = true;
  trackEvent(MIXPANEL_EVENTS.HOME_PAGE_RENDERED, {
    // navigation start 기준으로 홈 화면이 그려지기까지 걸린 총 시간
    time_to_render_ms: Math.round(performance.now()),
  });
};

const fireExitEvent = () => {
  if (homePageRendered) return;
  if (exitEventFired) return;

  exitEventFired = true;
  trackEventBeacon(MIXPANEL_EVENTS.PAGE_EXIT_BEFORE_RENDER, {
    // 사용자가 navigation start 이후 얼마 만에 이탈했는지
    time_on_page_ms: Math.round(performance.now()),
  });
};

/**
 * index.tsx에서 Mixpanel 초기화 직후 호출.
 * 홈 화면 렌더링 전 이탈 여부를 감지하기 위한 이벤트 리스너를 등록함.
 *
 * - visibilitychange (hidden): 탭 전환·최소화·닫기 등 모든 케이스 포함
 * - pagehide: visibilitychange를 지원하지 않는 환경의 폴백
 * 두 이벤트 모두 exitEventFired 플래그로 중복 전송 방지
 */
export const initEarlyExitTracking = () => {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      fireExitEvent();
    }
  });

  window.addEventListener('pagehide', fireExitEvent);
};
