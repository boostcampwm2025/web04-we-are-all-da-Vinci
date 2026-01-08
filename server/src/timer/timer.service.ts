import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { TimerCacheService } from 'src/redis/cache/timer-cache.service';

@Injectable()
export class TimerService implements OnModuleInit, OnModuleDestroy {
  private globalIntervalId?: NodeJS.Timeout;
  private onTimerTickCallback?: (roomId: string, timeLeft: number) => void;

  constructor(
    private readonly timerCacheService: TimerCacheService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(TimerService.name);
  }

  onModuleInit() {
    this.startGlobalTimer();
  }

  onModuleDestroy() {
    if (this.globalIntervalId) {
      clearInterval(this.globalIntervalId);
    }
  }

  setOnTimerTick(callback: (roomId: string, timeLeft: number) => void) {
    this.onTimerTickCallback = callback;
  }

  startGlobalTimer() {
    this.globalIntervalId = setInterval(() => {
      void (async () => {
        await this.tick();
      })();
    }, 1000);
    this.logger.info('Global Timer Started');
  }

  async tick() {
    const timers = await this.timerCacheService.getAllTimers();
    for (const timer of timers) {
      const updatedTimeLeft = await this.timerCacheService.decrementTimer(
        timer.roomId,
      );

      if (updatedTimeLeft !== null && updatedTimeLeft >= 0) {
        // Gateway에 알림
        if (this.onTimerTickCallback) {
          this.onTimerTickCallback(timer.roomId, updatedTimeLeft);
        }
      }
    }
  }

  async startTimer(roomId: string, timeLeft: number) {
    await this.timerCacheService.addTimer(roomId, timeLeft);
  }

  async cancelTimer(roomId: string) {
    await this.timerCacheService.deleteTimer(roomId);
  }
}
