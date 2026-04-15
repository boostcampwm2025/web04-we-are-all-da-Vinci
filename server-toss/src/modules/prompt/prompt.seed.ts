import { EntityManager, EntityRepository } from "@mikro-orm/core";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { StrokeSchema, type Stroke } from "@toss/shared";
import { readFile } from "node:fs/promises";
import { PinoLogger } from "nestjs-pino";
import * as path from "node:path";
import { z } from "zod";
import { DailyPrompt } from "./daily-prompt.entity";
import { Prompt } from "./prompt.entity";

export const SEED_START_DATE = new Date(Date.UTC(2026, 4, 1));
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const PromptStrokesSchema = z.array(z.array(StrokeSchema));

export interface SeedResult {
  seeded: number;
  skipped: boolean;
}

@Injectable()
export class PromptSeedService implements OnModuleInit {
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

  async onModuleInit(): Promise<void> {
    const data = await this.loadPromptStrokes();
    const result = await this.runIfEmpty(data);
    this.logger?.info(result, "Prompt seed executed");
  }

  async runIfEmpty(data: Stroke[][]): Promise<SeedResult> {
    const [promptCount, dailyCount] = await Promise.all([
      this.promptRepo.count(),
      this.dailyRepo.count(),
    ]);

    if (promptCount > 0 || dailyCount > 0) {
      return { seeded: 0, skipped: true };
    }

    await this.em.transactional(async (em) => {
      data.forEach((strokes, index) => {
        const prompt = new Prompt();
        prompt.strokes = JSON.stringify(strokes);

        const daily = new DailyPrompt();
        daily.prompt = prompt;
        daily.promptDate = new Date(
          SEED_START_DATE.getTime() + index * ONE_DAY_MS,
        );

        em.persist(prompt);
        em.persist(daily);
      });
      await em.flush();
    });

    return { seeded: data.length, skipped: false };
  }

  private async loadPromptStrokes(): Promise<Stroke[][]> {
    const promptPath = path.join(process.cwd(), "data", "promptStrokes.json");
    const raw = await readFile(promptPath, "utf-8");
    return PromptStrokesSchema.parse(JSON.parse(raw));
  }
}
