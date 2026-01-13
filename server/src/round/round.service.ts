import { Injectable, OnModuleInit } from '@nestjs/common';
import { GameRoom, Stroke } from 'src/common/types';
import { ClientEvents, GamePhase } from 'src/common/constants';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GameProgressCacheService } from 'src/redis/cache/game-progress-cache.service';
import { PinoLogger } from 'nestjs-pino';
import { TimerService } from 'src/timer/timer.service';
import { Server } from 'socket.io';
import { StandingsCacheService } from 'src/redis/cache/standings-cache.service';

@Injectable()
export class RoundService implements OnModuleInit {
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
      if (room.phase === GamePhase.DRAWING) {
        // Drawing -> Round_End로의 전환은 모든 플레이어가 제출해야 전환된다.
        // 따라서 타이머에 의한 전환을 막는다.
        // TODO: 에러로 인해 제출하지 못하는 경우를 막기 위해 제한 시간 이후에 강제 전환 로직이 필요
        return;
      }
      await this.nextPhase(room);
    });
  }

  setServer(server: Server) {
    this.server = server;
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

      case GamePhase.GAME_END:
        return await this.moveWaiting(room);

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

    if (roundResults.length < room.players.length) {
      return;
    }

    await this.nextPhase(room);
  }

  private async movePrompt(room: GameRoom) {
    room.phase = GamePhase.PROMPT;
    room.currentRound += 1;

    const promptStrokes = await this.getPromptForRound(room.currentRound);
    if (!promptStrokes) {
      throw new Error('제시 그림 불러오기에 실패했습니다.');
    }

    await this.cacheService.saveRoom(room.roomId, room);

    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);
    this.server.to(room.roomId).emit(ClientEvents.ROOM_PROMPT, promptStrokes);

    await this.timerService.startTimer(room.roomId, 5);
    this.logger.info({ room }, 'Prompt Phase Start');
  }

  private async moveDrawing(room: GameRoom) {
    room.phase = GamePhase.DRAWING;
    await this.cacheService.saveRoom(room.roomId, room);

    await this.timerService.startTimer(room.roomId, room.settings.drawingTime);
    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);

    this.logger.info({ room }, 'Drawing Phase Start');
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
      promptStrokes: (await this.getPromptForRound(room.currentRound)) || [],
    };

    await this.timerService.startTimer(room.roomId, 10);

    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);
    this.server.to(room.roomId).emit(ClientEvents.ROOM_ROUND_END, result);

    this.logger.info({ room }, 'Round End Phase Start');
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

    if (!champion) {
      this.logger.error(
        { roomId: room.roomId },
        '게임 결과를 계산할 수 없습니다. Standings이 비어져있습니다.',
      );
      throw new WebsocketException('게임 결과를 계산할 수 없습니다.');
    }

    const highlight = await this.progressCacheService.getHighlight(
      room.roomId,
      champion.socketId,
      room.settings.totalRounds,
    );

    if (!highlight) {
      this.logger.error(
        { roomId: room.roomId },
        '하이라이트가 존재하지 않습니다.',
      );
      throw new WebsocketException('하이라이트를 불러올 수 없습니다.');
    }

    const finalResult = {
      finalRankings: rankings,
      highlight: {
        promptStrokes: (await this.getPromptForRound(highlight.round)) || [],
        playerStrokes: highlight.strokes,
        similarity: highlight.similarity,
      },
    };

    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);
    this.server.to(room.roomId).emit(ClientEvents.ROOM_GAME_END, finalResult);

    await this.timerService.startTimer(room.roomId, 30);

    this.logger.info('Game End Start');
  }

  private async moveWaiting(room: GameRoom) {
    room.phase = GamePhase.WAITING;
    room.currentRound = 0;

    await this.cacheService.saveRoom(room.roomId, room);

    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);

    this.logger.info({ roomId: room.roomId }, 'Game Waiting Start');
  }

  private async loadPromptStrokes(): Promise<Stroke[][]> {
    const promptPath = path.join(process.cwd(), 'data', 'promptStrokes.json');
    const data = await fs.readFile(promptPath, 'utf-8');
    const promptStrokesData = JSON.parse(data) as Stroke[][];
    return promptStrokesData;
  }

  private async getPromptForRound(round: number): Promise<Stroke[] | null> {
    const promptStrokesData = await this.loadPromptStrokes();
    const index = round - 1;
    if (index < 0 || index >= promptStrokesData.length) {
      return null;
    }
    return promptStrokesData[index];
  }
}
