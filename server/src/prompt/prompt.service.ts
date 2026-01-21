import { readFile } from 'fs/promises';
import * as path from 'path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Stroke } from 'src/common/types';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { PinoLogger } from 'nestjs-pino';

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
    if (!index) {
      throw new WebsocketException('프롬프트가 존재하지 않습니다.');
    }
    this.logger.info({ length: promptStrokesData.length, index });
    return promptStrokesData[index];
  }

  async setPromptIds(roomId: string, totalRounds: number): Promise<number[]> {
    const promptStrokesData = await this.loadPromptStrokes();

    const length = promptStrokesData.length;
    if (length < totalRounds) {
      throw new BadRequestException('준비된 그림이 부족합니다.');
    }

    const ids = this.generateIds(length, totalRounds);

    await this.cacheService.addPromptIds(roomId, ...ids);

    this.logger.info({ ids }, 'PromptIds Generated.');
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
