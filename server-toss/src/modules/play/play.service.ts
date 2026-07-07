import { Injectable } from "@nestjs/common";
import type { PromptResponse } from "@toss/shared";
import { ChanceService } from "../chance/chance.service";
import { PromptService } from "../prompt/prompt.service";

@Injectable()
export class PlayService {
  constructor(
    private readonly chanceService: ChanceService,
    private readonly promptService: PromptService,
  ) {}

  async start(userKey: number, date: Date): Promise<PromptResponse> {
    const prompt = await this.promptService.getPromptByDate(date);
    await this.chanceService.consume(userKey);
    return prompt;
  }
}
