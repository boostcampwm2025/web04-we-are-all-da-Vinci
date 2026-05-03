import { EntityData } from "@mikro-orm/core";
import { Factory } from "@mikro-orm/seeder";
import { Drawing } from "src/modules/drawing/drawing.entity";

const createRandomSimilarity = () => {
  const minPenalty = 0;
  const maxPenalty = 30;
  const decimalPlaces = 2;

  const round = (value: number) => {
    const factor = 10 ** decimalPlaces;
    return Math.round(value * factor) / factor;
  };

  const strokeMatchSimilarity = round(Math.random() * 100);
  const shapeSimilarity = round(100 - strokeMatchSimilarity);

  const penalty = round(minPenalty + Math.random() * (maxPenalty - minPenalty));

  const score = round(
    Math.max(0, strokeMatchSimilarity + shapeSimilarity - penalty),
  );

  return {
    score,
    strokeMatchSimilarity,
    shapeSimilarity,
    penalty,
  };
};

export class DrawingFactory extends Factory<Drawing> {
  model = Drawing;
  definition(input: EntityData<Drawing>): EntityData<Drawing> {
    const similarity = createRandomSimilarity();
    return {
      ...input,
      similarity: JSON.stringify(similarity),
      score: similarity.score,
    };
  }
}
