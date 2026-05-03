import { EntityManager } from "@mikro-orm/core";
import { readFile } from "fs/promises";
import path from "path";
import { Prompt } from "src/modules/prompt/prompt.entity";
import { DatedPrompt } from "src/modules/prompt/prompt.seed";
import { StrokeSchema } from "@toss/shared";
import z from "zod";

const DatedPromptSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  strokes: z.array(StrokeSchema),
});
const PromptStrokesSchema = z.array(DatedPromptSchema);

export const loadPromptOne = async (em: EntityManager): Promise<Prompt> => {
  const prompt = await em.findOne(Prompt, { id: 1 });

  if (prompt) return prompt;

  const promptPath = path.join(process.cwd(), "data", "promptStrokes.json");
  const raw = await readFile(promptPath, "utf-8");
  const datedPrompts: DatedPrompt[] = PromptStrokesSchema.parse(
    JSON.parse(raw),
  );

  if (datedPrompts.length < 1) {
    throw new Error("프롬프트가 존재하지 않습니다.");
  }

  const datedPrompt = datedPrompts[0];

  return em.create(Prompt, {
    id: BigInt(1),
    strokes: JSON.stringify(datedPrompt.strokes),
  });
};

export const loadStrokesOne = async (): Promise<string> => {
  const promptPath = path.join(process.cwd(), "data", "promptStrokes.json");
  const raw = await readFile(promptPath, "utf-8");
  const datedPrompts: DatedPrompt[] = PromptStrokesSchema.parse(
    JSON.parse(raw),
  );

  if (datedPrompts.length < 1) {
    throw new Error("프롬프트가 존재하지 않습니다.");
  }

  const datedPrompt = datedPrompts[0];
  return JSON.stringify(datedPrompt.strokes);
};
