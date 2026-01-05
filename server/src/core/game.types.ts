import { GamePhase } from './game.constants';

export interface Stroke {
  points: [number[], number[]];
  color: [number, number, number];
}

export interface Player {
  socketId: string;
  nickname: string;
  isHost: boolean;
}

export interface PlayerResult {
  socketId: string;
  nickname: string;
  similarity: number;
}

export interface RoundResultEntry extends PlayerResult {
  strokes: Stroke[];
}

export interface GameResultEntry {
  socketId: string;
  nickname: string;
  score: number;
}

export type Phase = (typeof GamePhase)[keyof typeof GamePhase];
