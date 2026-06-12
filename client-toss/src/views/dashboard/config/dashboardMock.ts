/**
 * 대시보드 피드의 임시 mock 데이터.
 * 백엔드 API가 아직 없는 항목(연속참여·포인트·참가자 수·미션)을 UI 단계에서 채우기 위한 값.
 * 실데이터 연동 시 각 카드에서 이 상수 대신 hook 결과를 사용하도록 교체한다.
 */

/** 연속 참여 일수 */
export const STREAK_DAYS = 5;

/** 오늘 획득한 포인트 */
export const TODAY_POINTS = 4;

/** 지금까지 받은 누적 포인트 */
export const TOTAL_POINTS = 128;

/** 내일도 참여하면 받는 보너스 포인트 */
export const STREAK_BONUS_POINT = 10;
