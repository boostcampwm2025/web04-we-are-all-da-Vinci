export const ErrorCode = {
  // ROOM
  ROOM_NOT_FOUND: '방이 존재하지 않습니다.',
  ROOM_FULL: '방이 꽉 찼습니다.',

  // PLAYER
  PLAYER_NOT_FOUND: '플레이어가 존재하지 않습니다.',
  PLAYER_NOT_HOST: '플레이어가 방장이 아닙니다.',
  PLAYER_ATLEAST_TWO: '플레이어가 최소 2명이 필요합니다.',
  PLAYER_NOT_IN_ROOM: '플레이어가 참여 중이지 않습니다.',
  HOST_CAN_NOT_KICKED: '방장을 퇴장시킬 수 없습니다.',

  // PROMPT
  PROMPT_NOT_FOUND: '프롬프트가 존재하지 않습니다.',
  PROMPT_NOT_ENOUGH: '프롬프트가 총 라운드 수 보다 부족합니다.',

  // GAME
  GAME_ALREADY_STARTED: '게임이 이미 시작되었습니다.',
  GAME_NOT_END: '게임이 종료되지 않았습니다.',
  GAME_NOT_DRAWING_PHASE: '그림 그리기 단계가 아닙니다.',
  KICK_ONLY_WAITING_PHASE: '대기 상태에서만 퇴장시킬 수 있습니다.',
  UPDATE_SETTINGS_ONLY_WAITING_PHASE:
    '대기 상태에서만 설정을 바꿀 수 있습니다.',
} as const;
