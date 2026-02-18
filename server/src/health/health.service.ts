import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PromptService } from 'src/prompt/prompt.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly redisService: RedisService,
    private readonly promptService: PromptService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(HealthService.name);
  }

  async check() {
    const info = await Promise.all([this.checkRedis(), this.checkPrompts()]);

    const status = info.every(({ status }) => status === 'up') ? 'ok' : 'error';

    this.logger.info({ status, info }, 'Health Check');
    return { status, info };
  }

  private async checkRedis() {
    try {
      const client = this.redisService.getClient();
      const pong = await client.ping();

      return {
        name: 'redis',
        status: pong === 'PONG' ? 'up' : 'down',
      };
    } catch (err) {
      return {
        name: 'redis',
        status: 'down',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  private async checkPrompts() {
    try {
      const success = await this.promptService.checkPrompts();

      return {
        name: 'prompts',
        status: success ? 'up' : 'down',
      };
    } catch (err) {
      return {
        name: 'prompts',
        status: 'down',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
