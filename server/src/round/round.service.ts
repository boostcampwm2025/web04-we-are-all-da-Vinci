import { Injectable } from '@nestjs/common';
import { GameRoom, Stroke } from 'src/common/types';
import { GamePhase } from 'src/common/constants';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import * as fs from 'fs';
import * as path from 'path';
import { RoomPromptDto } from './dto/room-prompt.dto';
import { RoomRoundEndDto } from './dto/room-round-end.dto';
import { RoomGameEndDto } from './dto/room-game-end.dto';

@Injectable()
export class RoundService {
  constructor(private readonly cacheService: GameRoomCacheService) {}

  async nextPhase(room: GameRoom) {
    switch (room.phase) {
      case GamePhase.WAITING:
        return await this.movePrompt(room);

      case GamePhase.PROMPT:
        return await this.moveDrawing(room);

      case GamePhase.DRAWING:
        return await this.moveRoundEnd(room);

      case GamePhase.ROUND_END:
        return await this.moveNextRoundOrEnd(room);

      default:
        throw new WebsocketException(`알 수 없는 phase입니다: ${room.phase}`);
    }
  }

  private async movePrompt(room: GameRoom): Promise<RoomPromptDto> {
    room.phase = GamePhase.PROMPT;
    room.currentRound += 1;

    const promptStrokes = this.getPromptForRound(room.currentRound);
    if (!promptStrokes) {
      throw new Error('제시 그림 불러오기에 실패했습니다.');
    }

    await this.cacheService.saveRoom(room.roomId, room);

    return { promptStrokes };
  }

  private async moveDrawing(room: GameRoom): Promise<Record<string, never>> {
    room.phase = GamePhase.DRAWING;
    await this.cacheService.saveRoom(room.roomId, room);

    // PROMPT -> DRAWING 전환은 브로드캐스트할 데이터가 없음
    return {};
  }

  private async moveRoundEnd(room: GameRoom): Promise<RoomRoundEndDto> {
    room.phase = GamePhase.ROUND_END;
    await this.cacheService.saveRoom(room.roomId, room);

    // TODO: 라운드 결과 계산 로직 추가
    const roundResult = {
      rankings: [],
      promptStrokes: this.getPromptForRound(room.currentRound) || [],
    };

    return roundResult;
  }

  private async moveNextRoundOrEnd(
    room: GameRoom,
  ): Promise<RoomGameEndDto | RoomPromptDto> {
    if (room.currentRound >= room.settings.totalRounds) {
      // 게임 종료
      room.phase = GamePhase.GAME_END;
      await this.cacheService.saveRoom(room.roomId, room);

      // TODO: 최종 결과 계산 로직 추가
      const finalResult = {
        finalRankings: [],
        highlight: {
          promptStrokes: [],
          playerStrokes: [],
          similarity: 0,
        },
      };

      return finalResult;
    }

    // 다음 라운드 시작
    return await this.movePrompt(room);
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
