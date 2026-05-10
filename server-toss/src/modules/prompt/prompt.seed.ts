import {
  EntityManager,
  UniqueConstraintViolationException,
} from "@mikro-orm/core";
import { Injectable } from "@nestjs/common";
import { StrokeSchema, type Stroke } from "@toss/shared";
import { PinoLogger } from "nestjs-pino";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import { Drawing } from "../drawing/drawing.entity";
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
  added: number;
  deleted: number;
  protected: number;
  displaced: number;
}

const toDateString = (date: Date | string): string => {
  if (typeof date === "string") return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

@Injectable()
export class PromptSeedService {
  private readonly logger: PinoLogger | undefined;

  constructor(
    private readonly em: EntityManager,
    logger?: PinoLogger,
  ) {
    this.logger = logger;
    this.logger?.setContext(PromptSeedService.name);
  }

  async run(): Promise<SeedResult> {
    const data = await this.loadPromptStrokes();
    const result = await this.syncPrompts(data);
    this.logger?.info(result, "Prompt seed 완료");
    return result;
  }

  async syncPrompts(data: DatedPrompt[]): Promise<SeedResult> {
    const em = this.em.fork();
    let added = 0,
      deleted = 0,
      protectedCount = 0,
      displaced = 0;

    const lastJsonDate = data.reduce(
      (max, { date }) => (date > max ? date : max),
      "1970-01-01",
    );

    try {
      await em.transactional(async (txEm) => {
        const dailyRepo = txEm.getRepository(DailyPrompt);
        const drawingRepo = txEm.getRepository(Drawing);

        const allDailies = await dailyRepo.findAll({ populate: ["prompt"] });
        const protectedDates = new Set<string>();

        for (const daily of allDailies) {
          const dateStr = toDateString(daily.promptDate);
          const drawingCount = await drawingRepo.count({
            prompt: daily.prompt,
          });

          if (drawingCount > 0) {
            protectedDates.add(dateStr);
            protectedCount++;
            this.logger?.info(
              {
                event: "prompt.seed.protect",
                date: dateStr,
                promptId: String(daily.prompt.id),
              },
              `프롬프트 보존 (drawing 있음): ${dateStr}`,
            );
          } else {
            txEm.remove(daily);
            txEm.remove(daily.prompt);
            deleted++;
            this.logger?.info(
              {
                event: "prompt.seed.delete",
                date: dateStr,
                promptId: String(daily.prompt.id),
              },
              `프롬프트 삭제: ${dateStr}`,
            );
          }
        }

        // 삭제 먼저 flush → unique 제약 충돌 방지
        await txEm.flush();

        const usedDates = new Set<string>(protectedDates);
        let nextDisplacedDate = addDays(lastJsonDate, 1);

        for (const { date, strokes } of data) {
          let insertDate = date;

          if (usedDates.has(date)) {
            while (usedDates.has(nextDisplacedDate)) {
              nextDisplacedDate = addDays(nextDisplacedDate, 1);
            }
            insertDate = nextDisplacedDate;
            nextDisplacedDate = addDays(nextDisplacedDate, 1);
            displaced++;
            this.logger?.info(
              {
                event: "prompt.seed.displace",
                originalDate: date,
                newDate: insertDate,
              },
              `프롬프트 날짜 이동: ${date} → ${insertDate}`,
            );
          }

          const prompt = new Prompt();
          prompt.strokes = JSON.stringify(strokes);
          const daily = new DailyPrompt();
          daily.prompt = prompt;
          daily.promptDate = new Date(insertDate + "T00:00:00.000Z");
          txEm.persist(prompt);
          txEm.persist(daily);
          usedDates.add(insertDate);
          added++;

          this.logger?.info(
            { event: "prompt.seed.add", date: insertDate },
            `프롬프트 추가: ${insertDate}`,
          );
        }

        await txEm.flush();
      });
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        this.logger?.warn(
          { event: "prompt.seed.unique_conflict" },
          "UniqueConstraintViolation 발생 - seed 중단",
        );
        return { added: 0, deleted: 0, protected: 0, displaced: 0 };
      }
      throw error;
    }

    return { added, deleted, protected: protectedCount, displaced };
  }

  private async loadPromptStrokes(): Promise<DatedPrompt[]> {
    const promptPath = path.join(process.cwd(), "data", "promptStrokes.json");
    const raw = await readFile(promptPath, "utf-8");
    return PromptStrokesSchema.parse(JSON.parse(raw));
  }
}
