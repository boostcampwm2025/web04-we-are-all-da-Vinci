import { EntityManager } from "@mikro-orm/core";
import { Injectable } from "@nestjs/common";
import type { PromptResponse } from "@toss/shared";
import { ChanceService } from "../chance/chance.service";
import { PromptService } from "../prompt/prompt.service";

@Injectable()
export class PlayService {
  constructor(
    private readonly em: EntityManager,
    private readonly chanceService: ChanceService,
    private readonly promptService: PromptService,
  ) {}

  async start(userKey: number, date: Date): Promise<PromptResponse> {
    return this.em.transactional(async (em) => {
      const prompt = await this.promptService.getPromptByDate(date, em);
      await this.chanceService.consumeWithEntityManager(em, userKey);
      return prompt;
    });
  }
}
