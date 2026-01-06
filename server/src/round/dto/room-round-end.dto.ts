import { RoundResultEntry, Stroke } from 'src/common/types';

export class RoomRoundEndDto {
  rankings: RoundResultEntry[];
  promptStrokes: Stroke[];
}
