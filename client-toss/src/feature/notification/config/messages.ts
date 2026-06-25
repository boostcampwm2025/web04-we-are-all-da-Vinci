// 알림 동의 흐름의 사용자 노출 토스트 문구(해요체)와 개발 로그 라벨을 한곳에 모은다.
// 문구가 사용처에 흩어지지 않게 config로 분리(CLAUDE.md 컨벤션).

// label은 알림 타입 이름("오늘의 그림" 등). 토스트는 모두 해요체.
export const NOTIFICATION_TOAST = {
  agreed: (label: string) => `${label} 알림을 받기로 했어요`,
  rejected: (label: string) => `${label} 알림을 보내지 않을게요`,
  saveResultFailed: "알림 동의 결과 저장에 실패했어요",
  requestFailed: "알림 동의 요청에 실패했어요",
  rejectFailed: "알림 설정 변경에 실패했어요",
} as const;

// console.error 라벨(개발용, 비노출).
export const NOTIFICATION_LOG = {
  saveResultFailed: "[알림 동의 결과 저장 실패]",
  requestFailed: "[알림 동의 요청 실패]",
  uiFailed: "[알림 동의 UI 실행 실패]",
  rejectSaveFailed: "[알림 거부 저장 실패]",
} as const;
