/**
 * 대시보드 피드의 임시 mock 데이터.
 * 백엔드 API가 아직 없는 항목(연속참여·포인트·참가자 수·미션)을 UI 단계에서 채우기 위한 값.
 * 실데이터 연동 시 각 카드에서 이 상수 대신 hook 결과를 사용하도록 교체한다.
 */

/** 연속 참여 일수 */
export const STREAK_DAYS = 5;

/** 오늘 획득한 포인트 */
export const TODAY_POINTS = 4;

/** 내일도 참여하면 받는 보너스 포인트 */
export const STREAK_BONUS_POINT = 2;

export interface TodayMission {
  id: string;
  /** 미션 설명 — 해요체 카피 */
  label: string;
  /** 달성 시 지급 포인트 */
  point: number;
  /** 달성 여부 */
  done: boolean;
}

/** 오늘의 미션 목록 */
export const TODAY_MISSIONS: TodayMission[] = [
  {
    id: "no-penalty",
    label: "감점 없이 그림 1번 제출하기",
    point: 2,
    done: true,
  },
  { id: "score-70", label: "70점 이상 받기", point: 2, done: false },
];
