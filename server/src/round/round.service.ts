import { Injectable, OnModuleInit } from '@nestjs/common';
import { GameRoom, Stroke } from 'src/common/types';
import { ClientEvents, GamePhase } from 'src/common/constants';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import * as fs from 'fs';
import * as path from 'path';
import { RoomPromptDto } from './dto/room-prompt.dto';
import { GameProgressCacheService } from 'src/redis/cache/game-progress-cache.service';
import { PinoLogger } from 'nestjs-pino';
import { TimerService } from 'src/timer/timer.service';
import { WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { StandingsCacheService } from 'src/redis/cache/standings-cache.service';

@Injectable()
export class RoundService implements OnModuleInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly cacheService: GameRoomCacheService,
    private readonly progressCacheService: GameProgressCacheService,
    private readonly standingsCacheService: StandingsCacheService,
    private readonly timerService: TimerService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RoundService.name);
  }

  onModuleInit() {
    this.timerService.setOnTimerEnd(async (roomId: string) => {
      const room = await this.cacheService.getRoom(roomId);
      if (!room) {
        return;
      }
      await this.nextPhase(room);
    });
  }

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

  async onPlayerSubmit(roomId: string) {
    const room = await this.cacheService.getRoom(roomId);

    if (!room) {
      throw new WebsocketException('방이 존재하지 않습니다.');
    }

    const roundResults = await this.progressCacheService.getRoundResults(
      roomId,
      room.currentRound,
    );

    if (roundResults.length !== room.players.length) {
      return;
    }

    await this.nextPhase(room);
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

  private async moveRoundEnd(room: GameRoom) {
    room.phase = GamePhase.ROUND_END;
    await this.cacheService.saveRoom(room.roomId, room);

    const roundResults = await this.progressCacheService.getRoundResults(
      room.roomId,
      room.currentRound,
    );

    const idNicknameMapper: Record<string, string> = room.players.reduce(
      (prev, player) => ({ ...prev, [player.socketId]: player.nickname }),
      {},
    );

    const rankings = roundResults
      .sort((a, b) => b.similarity - a.similarity)
      .map((value) => ({
        ...value,
        nickname: idNicknameMapper[value.socketId],
      }));

    const result = {
      rankings: rankings,
      promptStrokes: this.getPromptForRound(room.currentRound) || [],
    };

    await this.timerService.startTimer(room.roomId, 10);

    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);
    this.server.to(room.roomId).emit(ClientEvents.ROOM_ROUND_END, result);
  }

  private async moveNextRoundOrEnd(room: GameRoom) {
    if (room.currentRound < room.settings.totalRounds) {
      // 다음 라운드 시작
      return await this.movePrompt(room);
    }

    // 게임 종료
    room.phase = GamePhase.GAME_END;
    await this.cacheService.saveRoom(room.roomId, room);

    const standings = await this.standingsCacheService.getStandings(
      room.roomId,
    );

    const idNicknameMapper: Record<string, string> = room.players.reduce(
      (prev, player) => ({ ...prev, [player.socketId]: player.nickname }),
      {},
    );

    const rankings = standings.map((value) => ({
      ...value,
      nickname: idNicknameMapper[value.socketId],
    }));

    const champion = rankings[0];

    const highlight = await this.progressCacheService.getHighlight(
      room.roomId,
      champion.socketId,
      room.settings.totalRounds,
    );

    const finalResult = {
      finalRankings: rankings,
      highlight: {
        promptStrokes: this.getPromptForRound(highlight.round) || [],
        playerStrokes: highlight.strokes,
        similarity: highlight.similarity,
      },
    };

    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);
    this.server.to(room.roomId).emit(ClientEvents.ROOM_GAME_END, finalResult);
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
