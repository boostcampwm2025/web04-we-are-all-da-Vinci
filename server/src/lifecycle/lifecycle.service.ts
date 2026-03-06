import {
  Injectable,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class LifecycleService
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly SERVER_STATE = {
    PENDING: 'pending',
    RUNNING: 'running',
    DRAINING: 'draining',
    TERMINATED: 'terminated',
  };

  private state;
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LifecycleService.name);
    this.state = this.SERVER_STATE.PENDING;
  }

  onModuleInit() {
    this.state = this.SERVER_STATE.RUNNING;
  }

  onModuleDestroy() {
    this.state = this.SERVER_STATE.DRAINING;
  }

  onApplicationShutdown(signal?: string) {
    this.logger.info({ signal }, 'onApplicationShutdown');
    this.state = this.SERVER_STATE.TERMINATED;
  }

  isRunning() {
    return this.state === this.SERVER_STATE.RUNNING;
  }
}
