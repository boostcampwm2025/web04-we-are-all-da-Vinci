/** 친구 초대 토스트 노출 시간(ms). */
export const INVITE_TOAST_DURATION_MS = 2500;

/** 초대 성공 — 그리기 기회를 받은 경우(하루 3회 한도 내). */
export const INVITE_CHANCE_GRANTED_MESSAGE = "그리기 기회 1회를 받았어요";

/** 초대 성공 — 기회 한도(하루 3회)를 넘어 미션만 진행된 경우. */
export const INVITE_MISSION_ONLY_MESSAGE =
  "친구를 초대했어요! 그리기 기회는 하루 3번까지 받을 수 있어요";

/** 초대 실패 기본 안내. */
export const INVITE_FAIL_MESSAGE =
  "초대에 실패했어요. 잠시 후 다시 시도해주세요.";

/** 초대 적립 성공 시, 기회 지급 여부에 따른 안내 문구. */
export const getInviteResultMessage = (chanceGranted: boolean): string =>
  chanceGranted ? INVITE_CHANCE_GRANTED_MESSAGE : INVITE_MISSION_ONLY_MESSAGE;

/** 공유 시트 하단 보상 안내 문구. */
export const INVITE_REWARD_NOTICE =
  "그리기 기회는 하루 3번까지 받고, 친구 5명을 초대하면 5원을 받아요.";
