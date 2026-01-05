import { RoundResultEntry, Stroke } from 'src/core/game.types';

export class RoomRoundEndDto {
  rankings: RoundResultEntry[];
  promptStrokes: Stroke[];
}
