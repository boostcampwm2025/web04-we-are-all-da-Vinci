import { GamePhase } from '../constants';

export interface Player {
  socketId: string;
  nickname: string;
  profileId: string;
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
  phase: Phase;
  currentRound: number;
  settings: Settings;
  promptId: number;
}

export type Phase = (typeof GamePhase)[keyof typeof GamePhase];
