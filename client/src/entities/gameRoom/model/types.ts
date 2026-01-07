import type { Phase } from '@/shared/config';
import type { Player } from '@/entities/player/model';

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
