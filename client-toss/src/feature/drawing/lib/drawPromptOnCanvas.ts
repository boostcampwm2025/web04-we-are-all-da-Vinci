import type { Stroke } from "@toss/shared";
import { drawStrokesOnCanvas } from "./drawStrokesOnCanvas";

export const drawPromptOnCanvas = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  promptStrokes: Stroke[],
) => {
  drawStrokesOnCanvas(canvas, ctx, promptStrokes, true);
};
