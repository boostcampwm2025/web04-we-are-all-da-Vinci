import { readFile } from 'fs/promises';
import * as path from 'path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Stroke } from 'src/common/types';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { PinoLogger } from 'nestjs-pino';
import { ErrorCode } from 'src/common/constants/error-code';

@Injectable()
export class PromptService {
  constructor(
    private readonly cacheService: GameRoomCacheService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PromptService.name);
  }

  async getPromptForRound(
    roomId: string,
    round: number,
  ): Promise<Stroke[] | null> {
    const promptStrokesData = await this.loadPromptStrokes();

    const index = await this.cacheService.getPromptId(roomId, round);

    if (index === null) {
      throw new WebsocketException(ErrorCode.PROMPT_NOT_FOUND);
    }

    return promptStrokesData[index];
  }

  async setPromptIds(roomId: string, totalRounds: number): Promise<number[]> {
    const promptStrokesData = await this.loadPromptStrokes();

    const length = promptStrokesData.length;
    if (length < totalRounds) {
      throw new BadRequestException(ErrorCode.PROMPT_NOT_ENOUGH);
    }

    const ids = this.generateIds(length, totalRounds);

    await this.cacheService.addPromptIds(roomId, ...ids);

    this.logger.info({ ids }, 'PromptIds Generated.');
    return ids;
  }

  async resetPromptIds(roomId: string, totalRounds: number) {
    const promptStrokesData = await this.loadPromptStrokes();

    const length = promptStrokesData.length;
    if (length < totalRounds) {
      throw new BadRequestException(ErrorCode.PROMPT_NOT_ENOUGH);
    }

    const ids = this.generateIds(length, totalRounds);

    await this.cacheService.resetPromptIds(roomId, ...ids);

    this.logger.info({ ids }, 'PromptIds Regenerated.');
    return ids;
  }

  private generateIds(totalPrompts: number, totalRounds: number) {
    const ids = [...new Array<number>(totalPrompts)]
      .map((_, idx) => ({
        idx,
        random: Math.random(),
      }))
      .sort((a, b) => b.random - a.random)
      .slice(0, totalRounds)
      .map(({ idx }) => idx);

    return ids;
  }

  private async loadPromptStrokes(): Promise<Stroke[][]> {
    const promptPath = path.join(process.cwd(), 'data', 'promptStrokes.json');
    const data = await readFile(promptPath, 'utf-8');
    const promptStrokesData = JSON.parse(data) as Stroke[][];
    return promptStrokesData;
  }
}
