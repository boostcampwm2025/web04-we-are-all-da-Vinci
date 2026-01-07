import { GameResultEntry, Stroke } from 'src/common/types';

export class RoomGameEndDto {
  finalRankings!: GameResultEntry[];
  highlight!: {
    promptStrokes: Stroke[];
    playerStrokes: Stroke[];
    similarity: number;
  };
}
