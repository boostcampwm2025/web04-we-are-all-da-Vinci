import { Stroke } from 'src/core/game.types';

export class UserDrawingDto {
  roomId: string;
  similarity: number;
  strokes: Stroke[];
}
