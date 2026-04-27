import {
  EntityManager,
  EntityRepository,
  UniqueConstraintViolationException,
} from "@mikro-orm/core";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable } from "@nestjs/common";
import { StrokeSchema, type Stroke } from "@toss/shared";
import { PinoLogger } from "nestjs-pino";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import { DailyPrompt } from "./daily-prompt.entity";
import { Prompt } from "./prompt.entity";

const DatedPromptSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  strokes: z.array(StrokeSchema),
});
const PromptStrokesSchema = z.array(DatedPromptSchema);

export interface DatedPrompt {
  date: string;
  strokes: Stroke[];
}

export interface SeedResult {
  seeded: number;
  skipped: boolean;
}

@Injectable()
export class PromptSeedService {
  private readonly logger: PinoLogger | undefined;

  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Prompt)
    private readonly promptRepo: EntityRepository<Prompt>,
    @InjectRepository(DailyPrompt)
    private readonly dailyRepo: EntityRepository<DailyPrompt>,
    logger?: PinoLogger,
  ) {
    this.logger = logger;
    this.logger?.setContext(PromptSeedService.name);
  }

  async run(): Promise<SeedResult> {
    const data = await this.loadPromptStrokes();
    const result = await this.runIfEmpty(data);
    this.logger?.info(result, "Prompt seed executed");
    return result;
  }

  async runIfEmpty(data: DatedPrompt[]): Promise<SeedResult> {
    const em = this.em.fork();
    let seeded = false;

    try {
      await em.transactional(async (txEm) => {
        const promptRepo = txEm.getRepository(Prompt);
        const dailyRepo = txEm.getRepository(DailyPrompt);
        const [promptCount, dailyCount] = await Promise.all([
          promptRepo.count(),
          dailyRepo.count(),
        ]);

        if (promptCount > 0 || dailyCount > 0) {
          return;
        }

        data.forEach(({ date, strokes }) => {
          const prompt = new Prompt();
          prompt.strokes = JSON.stringify(strokes);

          const daily = new DailyPrompt();
          daily.prompt = prompt;
          daily.promptDate = new Date(date + "T00:00:00.000Z");

          txEm.persist(prompt);
          txEm.persist(daily);
        });
        await txEm.flush();
        seeded = true;
      });
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        return { seeded: 0, skipped: true };
      }
      throw error;
    }

    return seeded
      ? { seeded: data.length, skipped: false }
      : { seeded: 0, skipped: true };
  }

  private async loadPromptStrokes(): Promise<DatedPrompt[]> {
    const promptPath = path.join(process.cwd(), "data", "promptStrokes.json");
    const raw = await readFile(promptPath, "utf-8");
    return PromptStrokesSchema.parse(JSON.parse(raw));
  }
}
