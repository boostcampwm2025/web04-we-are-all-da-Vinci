import { Similarity, Stroke } from 'src/common/types';

export class UserDrawingDto {
  roomId!: string;
  similarity!: Similarity;
  strokes!: Stroke[];
}
