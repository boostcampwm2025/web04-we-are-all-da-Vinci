import { GameResultEntry, Stroke } from 'src/core/game.types';

export class RoomGameEndDto {
  finalRankings: GameResultEntry[];
  highlight: {
    promptStrokes: Stroke[];
    playerStrokes: Stroke[];
    similarity: number;
  };
}
