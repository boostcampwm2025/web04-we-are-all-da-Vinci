export interface Player {
  socketId: string;
  nickname: string;
  isHost: boolean;
}

export interface Settings {
  drawingTime: number;
  totalRounds: number;
  maxPlayer: number;
}

export interface GameRoom {
  roomId: string;
  players: Player[];
  phase: 'WAITING' | 'PROMPT' | 'DRAWING' | 'ROUND_END' | 'GAME_END';
  currentRound: number;
  settings: Settings;
}
