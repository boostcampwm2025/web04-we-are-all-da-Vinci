import type { Similarity } from "@davinci/similarity";
import type { Stroke } from "@toss/shared";

export class SaveDrawingDto {
  public readonly promptId: number;
  public readonly strokes: Stroke[];
  public readonly similarity: Similarity;

  constructor(promptId: number, strokes: Stroke[], similarity: Similarity) {
    this.promptId = promptId;
    this.strokes = strokes;
    this.similarity = similarity;
  }
}
