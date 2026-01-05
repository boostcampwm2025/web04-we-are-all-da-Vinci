import { Controller, Get } from '@nestjs/common';
import { RedisService } from './redis.service';

@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  @Get('test')
  async test() {
    try {
      const client = this.redisService.getClient();

      const pong = await client.ping();
      console.log('✅ Ping:', pong);

      return {
        success: true,
        message: 'Redis 연결 및 테스트 성공',
        results: {
          ping: pong,
        },
      };
    } catch (error) {
      console.error('❌ Redis 테스트 실패:', error);
      return {
        success: false,
        message: 'Redis 연결 실패',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('health')
  async health() {
    try {
      const client = this.redisService.getClient();
      const pong = await client.ping();

      return {
        status: 'ok',
        redis: pong === 'PONG' ? 'connected' : 'disconnected',
      };
    } catch (error) {
      return {
        status: 'error',
        redis: 'disconnected',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
