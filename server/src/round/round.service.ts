import { Injectable } from '@nestjs/common';
import { GamePhase } from 'src/common/constants';
import { GameRoom } from 'src/common/types';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';

@Injectable()
export class RoundService {
  constructor(private readonly cacheService: GameRoomCacheService) {}

  async nextPhase(room: GameRoom) {
    switch (room.phase) {
      case GamePhase.WAITING:
        await this.movePrompt(room);
        break;

      default:
        break;
    }
  }

  private async movePrompt(room: GameRoom) {
    room.phase = GamePhase.PROMPT;
    room.currentRound += 1;

    await this.cacheService.saveRoom(room.roomId, room);

    // TODO: 메타데이터 브로드캐스트
    // TODO: 그림 제시
    // TODO: 타이머 시작
  }
}
