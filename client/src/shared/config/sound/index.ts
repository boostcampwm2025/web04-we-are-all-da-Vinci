export const SFX_LIST = {
  TIMER: 'TIMER',
  ROUND_END: 'ROUND_END',
};

export const BGM_LIST = {
  WAITING: 'BGB_WAITING',
  GAME_END: 'BGM_GAME_END',
  DRAWING: 'BGM_DRAWING',
};

export const SFX_PATH = {
  [SFX_LIST.ROUND_END]: '/audio/roundEnd.mp3',
  [SFX_LIST.TIMER]: '/audio/ticktock.mp3',
};

export const BGM_PATH = {
  [BGM_LIST.WAITING]: '/audio/bgm_waiting.mp3',
  [BGM_LIST.GAME_END]: '/audio/bgm_gameEnd.mp3',
  [BGM_LIST.DRAWING]: '/audio/bgm_drawing.mp3',
};
