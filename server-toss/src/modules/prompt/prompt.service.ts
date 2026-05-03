import { preprocessStrokes } from "@davinci/similarity";
import { EntityRepository } from "@mikro-orm/core";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { Stroke } from "@toss/shared";
import { DailyPrompt } from "./daily-prompt.entity";
import { DrawingAccessService } from "../drawing/service/drawing-access.service";
import { UserService } from "../user/user.service";

type Preprocessed = ReturnType<typeof preprocessStrokes>;

@Injectable()
export class PromptService {
  private readonly preprocessedCache = new Map<number, Preprocessed>();
  private readonly cacheDisabled = process.env.DISABLE_PROMPT_CACHE === "true";

  constructor(
    @InjectRepository(DailyPrompt)
    private readonly dailyRepo: EntityRepository<DailyPrompt>,
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
    const daily = await this.dailyRepo.findOne(
      { promptDate: date },
      { populate: ["prompt"] }, // prompt 관계까지 JOIN으로 함께 로드 (기본 lazy)
    );
    if (!daily) {
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
      return { promptId, preprocessed: preprocessStrokes(strokes) };
    }
    const cached = this.preprocessedCache.get(promptId);
    if (cached) {
      return { promptId, preprocessed: cached };
    }
    const preprocessed = preprocessStrokes(strokes);
    this.preprocessedCache.set(promptId, preprocessed);
    return { promptId, preprocessed };
  }
}
