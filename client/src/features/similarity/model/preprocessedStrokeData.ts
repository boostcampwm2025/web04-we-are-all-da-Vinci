import { type Point, type Stroke } from '@/entities/similarity';

export interface PreprocessedStrokeData {
  normalizedStrokes: Stroke[];
  strokeCount: number;
  points: Point[];
  hull: Point[];
  hullArea: number;
  hullPerimeter: number;
  radialSignature: number[];
}
