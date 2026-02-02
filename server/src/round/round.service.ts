import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Server } from 'socket.io';
import { DRAWING_END_DELAY, GamePhase } from 'src/common/constants';
import { GameRoom } from 'src/common/types';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { TimerService } from 'src/timer/timer.service';
import { PhaseService } from './phase.service';

@Injectable()
export class RoundService implements OnModuleInit {
  server!: Server;
  private phaseChangeHandler?: (roomId: string) => Promise<void>;

  constructor(
    private readonly cacheService: GameRoomCacheService,
    private readonly timerService: TimerService,
    private readonly phaseService: PhaseService,
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

  setPhaseChangeHandler(handler: (roomId: string) => Promise<void>) {
    this.phaseChangeHandler = handler;
  }

  private async notifyPhaseChange(roomId: string) {
    if (this.phaseChangeHandler) await this.phaseChangeHandler(roomId);
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
  private async moveWaiting(room: GameRoom) {
    if (room.phase !== GamePhase.GAME_END) {
      return;
    }

    await this.phaseService.waiting(room);
    await this.timerService.cancelTimer(room.roomId);

    this.logger.info({ roomId: room.roomId }, 'Game Waiting Start');

    await this.notifyPhaseChange(room.roomId);
  }

  private async movePrompt(room: GameRoom) {
    const { events, timeLeft } = await this.phaseService.prompt(room);

    events.forEach(({ event, payload }) => {
      this.server.to(room.roomId).emit(event, payload);
    });

    await this.timerService.startTimer(room.roomId, timeLeft);
    this.logger.info({ room }, 'Prompt Phase Start');

    await this.notifyPhaseChange(room.roomId);
  }

  private async moveDrawing(room: GameRoom) {
    const { events, timeLeft } = await this.phaseService.drawing(room);

    events.forEach(({ event, payload }) => {
      this.server.to(room.roomId).emit(event, payload);
    });

    await this.timerService.startTimer(room.roomId, timeLeft);
    this.logger.info({ room }, 'Drawing Phase Start');

    await this.notifyPhaseChange(room.roomId);
  }

  private async moveRoundReplay(room: GameRoom) {
    const { events, timeLeft } = await this.phaseService.roundReplay(room);

    events.forEach(({ event, payload }) => {
      this.server.to(room.roomId).emit(event, payload);
    });

    await this.timerService.startTimer(room.roomId, timeLeft);

    this.logger.info({ room }, 'Round Replay Phase Start');

    await this.notifyPhaseChange(room.roomId);
  }

  private async moveRoundStanding(room: GameRoom) {
    const { events, timeLeft } = await this.phaseService.roundStanding(room);

    events.forEach(({ event, payload }) => {
      this.server.to(room.roomId).emit(event, payload);
    });

    await this.timerService.startTimer(room.roomId, timeLeft);

    this.logger.info({ room }, 'Round Standing Phase Start');

    await this.notifyPhaseChange(room.roomId);
  }

  private async moveNextRoundOrEnd(room: GameRoom) {
    if (room.currentRound < room.settings.totalRounds) {
      // 다음 라운드 시작
      return await this.movePrompt(room);
    }

    // 게임 종료
    const { events, timeLeft } = await this.phaseService.gameEnd(room);

    events.forEach(({ event, payload }) => {
      this.server.to(room.roomId).emit(event, payload);
    });

    await this.timerService.startTimer(room.roomId, timeLeft);

    this.logger.info('Game End Start');
    await this.notifyPhaseChange(room.roomId);
  }

  async getRoundReplayData(roomId: string) {
    return await this.phaseService.getRoundReplayData(roomId);
  }

  async getRoundStandingData(roomId: string) {
    return await this.phaseService.getRoundStandingData(roomId);
  }

  async getGameEndData(roomId: string) {
    return await this.phaseService.getGameEndData(roomId);
  }
}
