import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { GameRoom, Player, Stroke } from 'src/common/types';
import {
  ClientEvents,
  DRAWING_END_DELAY,
  GAME_END_TIME,
  GamePhase,
  PROMPT_TIME,
  ROUND_REPLAY_TIME,
  ROUND_STANDING_TIME,
} from 'src/common/constants';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { GameProgressCacheService } from 'src/redis/cache/game-progress-cache.service';
import { PinoLogger } from 'nestjs-pino';
import { TimerService } from 'src/timer/timer.service';
import { Server } from 'socket.io';
import { StandingsCacheService } from 'src/redis/cache/standings-cache.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import { PromptService } from 'src/prompt/prompt.service';

@Injectable()
export class RoundService implements OnModuleInit {
  server!: Server;

  constructor(
    private readonly cacheService: GameRoomCacheService,
    private readonly progressCacheService: GameProgressCacheService,
    private readonly standingsCacheService: StandingsCacheService,
    private readonly leaderboardCacheService: LeaderboardCacheService,
    private readonly timerService: TimerService,
    private readonly promptService: PromptService,
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
        setTimeout(() => {
          this.nextPhase(room);
        }, DRAWING_END_DELAY);
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
        return await this.moveRoundReplay(room);

      case GamePhase.ROUND_REPLAY:
        return await this.moveRoundStanding(room);

      case GamePhase.ROUND_STANDING:
        return await this.moveNextRoundOrEnd(room);

      case GamePhase.GAME_END:
        return await this.moveWaiting(room);

      default:
        this.logger.error({ room }, '알 수 없는 phase입니다');
    }
  }

  private createPlayerMapper(
    players: Player[],
  ): Record<string, { nickname: string; profileId: string }> {
    return players.reduce(
      (prev, player) => ({
        ...prev,
        [player.socketId]: {
          nickname: player.nickname,
          profileId: player.profileId,
        },
      }),
      {},
    );
  }

  private async movePrompt(room: GameRoom) {
    room.phase = GamePhase.PROMPT;
    room.currentRound += 1;

    const promptStrokes = await this.promptService.getPromptForRound(
      room.roomId,
      room.currentRound,
    );
    if (!promptStrokes) {
      throw new Error('제시 그림 불러오기에 실패했습니다.');
    }

    await this.cacheService.saveRoom(room.roomId, room);

    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);
    this.server.to(room.roomId).emit(ClientEvents.ROOM_PROMPT, promptStrokes);

    await this.timerService.startTimer(room.roomId, PROMPT_TIME);
    this.logger.info({ room }, 'Prompt Phase Start');
  }

  private async moveDrawing(room: GameRoom) {
    room.phase = GamePhase.DRAWING;
    await this.cacheService.saveRoom(room.roomId, room);

    await this.timerService.startTimer(room.roomId, room.settings.drawingTime);
    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);

    this.logger.info({ room }, 'Drawing Phase Start');
  }

  private async moveRoundReplay(room: GameRoom) {
    room.phase = GamePhase.ROUND_REPLAY;
    await this.cacheService.saveRoom(room.roomId, room);

    const roundResults = await this.progressCacheService.getRoundResults(
      room.roomId,
      room.currentRound,
    );

    const playerMapper = this.createPlayerMapper(room.players);

    const rankings = roundResults
      .sort((a, b) => b.similarity.similarity - a.similarity.similarity)
      .map((value) => ({
        ...value,
        nickname: playerMapper[value.socketId]?.nickname,
        profileId: playerMapper[value.socketId]?.profileId,
      }));

    const result = {
      rankings: rankings,
      promptStrokes:
        (await this.promptService.getPromptForRound(
          room.roomId,
          room.currentRound,
        )) || [],
    };

    await this.timerService.startTimer(room.roomId, ROUND_REPLAY_TIME);

    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);
    this.server.to(room.roomId).emit(ClientEvents.ROOM_ROUND_REPLAY, result);

    this.logger.info({ room }, 'Round Replay Phase Start');
  }

private async moveRoundStanding(room: GameRoom) {
  room.phase = GamePhase.ROUND_STANDING;

  const standings = await this.standingsCacheService.getStandings(room.roomId);
  const playerMapper = this.createPlayerMapper(room.players);

  const rankings = standings.map((value) => ({
    ...value,
    nickname: playerMapper[value.socketId]?.nickname,
    profileId: playerMapper[value.socketId]?.profileId,
  }));

  const result = { rankings };

  await this.cacheService.saveRoom(room.roomId, room);
  await this.timerService.startTimer(room.roomId, ROUND_STANDING_TIME);

  this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);
  this.server.to(room.roomId).emit(ClientEvents.ROOM_ROUND_STANDING, result);

  this.logger.info({ room }, 'Round Standing Phase Start');
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

    const playerMapper = this.createPlayerMapper(room.players);

    const rankings = standings.map((value) => ({
      ...value,
      nickname: playerMapper[value.socketId]?.nickname,
      profileId: playerMapper[value.socketId]?.profileId,
    }));

    const champion = rankings[0];

    if (!champion) {
      this.logger.error(
        { roomId: room.roomId },
        '게임 결과를 계산할 수 없습니다. Standings이 비어져있습니다.',
      );
      throw new InternalServerErrorException('게임 결과를 계산할 수 없습니다.');
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
      throw new InternalServerErrorException(
        '하이라이트를 불러올 수 없습니다.',
      );
    }

    const finalResult = {
      finalRankings: rankings,
      highlight: {
        promptStrokes:
          (await this.promptService.getPromptForRound(
            room.roomId,
            highlight.round,
          )) || [],
        playerStrokes: highlight.strokes,
        similarity: highlight.similarity,
      },
    };

    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);
    this.server.to(room.roomId).emit(ClientEvents.ROOM_GAME_END, finalResult);

    await this.timerService.startTimer(room.roomId, GAME_END_TIME);

    this.logger.info('Game End Start');
  }

  private async moveWaiting(room: GameRoom) {
    if (room.phase !== GamePhase.GAME_END) {
      return;
    }

    // GAME_END 타이머 취소 (재시작 시 자동 시작 방지)
    await this.timerService.cancelTimer(room.roomId);

    room.phase = GamePhase.WAITING;
    room.currentRound = 0;

    await this.cacheService.saveRoom(room.roomId, room);

    await this.progressCacheService.deleteAll(room.roomId);
    await this.standingsCacheService.deleteAll(room.roomId);
    await this.leaderboardCacheService.deleteAll(room.roomId);

    this.server.to(room.roomId).emit(ClientEvents.ROOM_METADATA, room);

    this.logger.info({ roomId: room.roomId }, 'Game Waiting Start');
  }
}
