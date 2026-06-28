import { preprocessStrokes } from "@davinci/similarity";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Stroke } from "@toss/shared";
import { DrawingAccessService } from "../drawing/service/drawing-access.service";
import { UserService } from "../user/user.service";
import { DailyPrompt } from "./daily-prompt.entity";
import { EntityManager } from "@mikro-orm/mysql";

type Preprocessed = ReturnType<typeof preprocessStrokes>;

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name);
  private readonly preprocessedCache = new Map<number, Preprocessed>();
  private readonly cacheDisabled = process.env.DISABLE_PROMPT_CACHE === "true";

  constructor(
    private readonly em: EntityManager,
    private readonly userService: UserService,
    private readonly drawingAccessService: DrawingAccessService,
  ) {}

  async getDailyPrompt(userKey: number, date: Date) {
    const user = await this.userService.getUserInfo(userKey);
    await this.drawingAccessService.validateAccess(user);

    return await this.getPromptByDate(date);
  }

  async getPromptByDate(
    date: Date,
  ): Promise<{ promptId: number; strokes: Stroke[] }> {
    const daily = await this.em.findOne(
      DailyPrompt,
      { promptDate: date },
      { populate: ["prompt"] },
    );

    if (!daily) {
      this.logger.warn(
        { event: "prompt.not_found", date: date.toISOString() },
        "오늘 날짜에 배정된 프롬프트 없음",
      );
      throw new NotFoundException("PROMPT_NOT_FOUND");
    }

    const prompt = daily.prompt;
    return {
      promptId: Number(prompt.id),
      strokes: JSON.parse(prompt.strokes) as Stroke[],
    };
  }

  // POST /strokes가 획 단위로 호출되므로 preprocess 결과를 promptId별로 메모리 캐시
  async getPreprocessedByDate(
    date: Date,
  ): Promise<{ promptId: number; preprocessed: Preprocessed }> {
    const { promptId, strokes } = await this.getPromptByDate(date);
    if (this.cacheDisabled) {
      this.logger.debug(
        { event: "prompt.preprocess.cache_disabled", promptId },
        "프롬프트 전처리 캐시 비활성화",
      );
      return { promptId, preprocessed: preprocessStrokes(strokes) };
    }

    const cached = this.preprocessedCache.get(promptId);
    if (cached) {
      this.logger.debug(
        { event: "prompt.preprocess.cache_hit", promptId },
        "프롬프트 전처리 캐시 적중",
      );
      return { promptId, preprocessed: cached };
    }

    const preprocessed = preprocessStrokes(strokes);
    this.preprocessedCache.set(promptId, preprocessed);
    this.logger.debug(
      { event: "prompt.preprocess.cache_miss", promptId },
      "프롬프트 전처리 캐시 미스",
    );
    return { promptId, preprocessed };
  }
}
