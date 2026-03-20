import type { Point, Stroke } from "@shared/types";

export interface PreprocessedStrokeData {
  normalizedStrokes: Stroke[];
  strokeCount: number;
  points: Point[];
  hull: Point[];
  hullArea: number;
  hullPerimeter: number;
  radialSignature: number[];
}
