import { Injectable } from '@nestjs/common';
import { GameRoom, Stroke } from 'src/common/types';
import { GamePhase } from 'src/common/constants';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RoundService {
  constructor(private readonly cacheService: GameRoomCacheService) {}

  async startRound(roomId: string, round: number) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) {
      throw new WebsocketException('방이 존재하지 않습니다.');
    }
    room.phase = GamePhase.PROMPT;
    room.currentRound = round;
    await this.cacheService.saveRoom(roomId, room);

    const promptStrokes = this.getPromptForRound(round);

    if (!promptStrokes) {
      throw new Error('제시 그림 불러오기에 실패했습니다.');
    }

    return { room, promptStrokes };
  }

  async endRound(roomId: string): Promise<GameRoom> {
    const room = await this.cacheService.getRoom(roomId);

    if (!room) {
      throw new WebsocketException('방이 존재하지 않습니다.');
    }

    room.phase = GamePhase.ROUND_END;
    await this.cacheService.saveRoom(roomId, room);

    return room;
  }

  private loadPromptStrokes(): Stroke[][] {
    const promptPath = path.join(process.cwd(), 'data', 'promptStrokes.json');
    const data = fs.readFileSync(promptPath, 'utf-8');
    const promptStrokesData = JSON.parse(data) as Stroke[][];
    return promptStrokesData;
  }

  private getPromptForRound(round: number): Stroke[] | null {
    const promptStrokesData = this.loadPromptStrokes();
    const index = round - 1;
    if (index < 0 || index >= promptStrokesData.length) {
      return null;
    }
    return promptStrokesData[index];
  }
}
