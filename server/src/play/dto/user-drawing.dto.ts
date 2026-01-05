import { Stroke } from 'src/core/drawing.types';

export class SubmitDrawingDto {
  roomId: string;
  similarity: number;
  strokes: Stroke[];
}
