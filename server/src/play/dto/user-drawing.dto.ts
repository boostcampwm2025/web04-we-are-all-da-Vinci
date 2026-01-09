import { Stroke } from 'src/common/types';

export class UserDrawingDto {
  roomId!: string;
  similarity!: number;
  strokes!: Stroke[];
}
