import type { Player } from '@/entities/player';
import type { Phase } from '@/shared/config';

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
}
