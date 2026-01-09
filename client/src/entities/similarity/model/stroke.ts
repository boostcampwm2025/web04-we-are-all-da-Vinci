import type { Color } from './color';

export interface Stroke {
  points: [number[], number[]]; // [[x좌표 배열], [y좌표 배열]]
  color: Color;
}
