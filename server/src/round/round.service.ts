import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Server } from 'socket.io';
import { DRAWING_END_DELAY, GamePhase } from '../common/constants';
import { GameRoom } from 'src/common/types';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { TimerService } from 'src/timer/timer.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PhaseEvent, PhaseService } from './phase.service';

@Injectable()
export class RoundService implements OnModuleInit {
  server!: Server;

  constructor(
    private readonly cacheService: GameRoomCacheService,
    private readonly timerService: TimerService,
    private readonly emitter: EventEmitter2,
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
          void this.nextPhase(room);
        }, DRAWING_END_DELAY);
        return;
      }
      await this.nextPhase(room);
    });
  }

  setServer(server: Server) {
    this.server = server;
  }

  private notifyPhaseChange(roomId: string, events: PhaseEvent[]) {
    this.emitter.emit('phase_changed', { roomId, events });
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

  async endGame(room: GameRoom) {
    await this.moveGameEnd(room);
  }

  private async moveWaiting(room: GameRoom) {
    if (room.phase !== GamePhase.GAME_END) {
      return;
    }

    await this.phaseService.waiting(room);
    await this.timerService.cancelTimer(room.roomId);

    this.logger.info({ roomId: room.roomId }, 'Game Waiting Start');

    this.notifyPhaseChange(room.roomId, []);
  }

  private async movePrompt(room: GameRoom) {
    const { events, timeLeft } = await this.phaseService.prompt(room);

    events.forEach(({ name, payload }) => {
      this.server.to(room.roomId).emit(name, payload);
    });

    await this.timerService.startTimer(room.roomId, timeLeft);
    this.logger.info({ room }, 'Prompt Phase Start');

    this.notifyPhaseChange(room.roomId, events);
  }

  private async moveDrawing(room: GameRoom) {
    const { events, timeLeft } = await this.phaseService.drawing(room);

    events.forEach(({ name, payload }) => {
      this.server.to(room.roomId).emit(name, payload);
    });

    await this.timerService.startTimer(room.roomId, timeLeft);
    this.logger.info({ room }, 'Drawing Phase Start');

    this.notifyPhaseChange(room.roomId, events);
  }

  private async moveRoundReplay(room: GameRoom) {
    const { events, timeLeft } = await this.phaseService.roundReplay(room);

    events.forEach(({ name, payload }) => {
      this.server.to(room.roomId).emit(name, payload);
    });

    await this.timerService.startTimer(room.roomId, timeLeft);

    this.logger.info({ room }, 'Round Replay Phase Start');

    this.notifyPhaseChange(room.roomId, events);
  }

  private async moveRoundStanding(room: GameRoom) {
    const { events, timeLeft } = await this.phaseService.roundStanding(room);

    events.forEach(({ name, payload }) => {
      this.server.to(room.roomId).emit(name, payload);
    });

    await this.timerService.startTimer(room.roomId, timeLeft);

    this.logger.info({ room }, 'Round Standing Phase Start');

    this.notifyPhaseChange(room.roomId, events);
  }

  private async moveNextRoundOrEnd(room: GameRoom) {
    if (room.currentRound < room.settings.totalRounds) {
      // 다음 라운드 시작
      return await this.movePrompt(room);
    }

    // 게임 종료
    await this.moveGameEnd(room);
  }

  private async moveGameEnd(room: GameRoom) {
    const { events, timeLeft } = await this.phaseService.gameEnd(room);

    events.forEach(({ name, payload }) => {
      this.server.to(room.roomId).emit(name, payload);
    });

    await this.timerService.startTimer(room.roomId, timeLeft);

    this.logger.info('Game End Start');
    this.notifyPhaseChange(room.roomId, events);
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
