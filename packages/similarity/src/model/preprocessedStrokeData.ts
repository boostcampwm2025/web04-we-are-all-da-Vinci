import type { Point, Stroke } from "../types";

export interface PreprocessedStrokeData {
  normalizedStrokes: Stroke[];
  strokeCount: number;
  points: Point[];
  hull: Point[];
  hullArea: number;
  hullPerimeter: number;
  radialSignature: number[];
}
