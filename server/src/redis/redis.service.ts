import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private client: RedisClientType;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RedisService.name);

    this.client = createClient({
      socket: {
        host: this.configService.get('REDIS_HOST'),
        port: parseInt(this.configService.get('REDIS_PORT') || '6379', 10),
      },
    });

    this.client.on('error', (err) => {
      this.logger.error(err, 'Redis Client Error');
    });

    this.client.on('connect', () => {
      this.logger.info('Redis Connecting...');
    });

    this.client.on('ready', () => {
      this.logger.info('Redis Connected and Ready!');
    });
  }

  async onModuleInit() {
    await this.connect();
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  // 편의 메서드들
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async hSet(key: string, field: string, value: string): Promise<void> {
    await this.client.hSet(key, field, value);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.client.hGetAll(key);
  }

  async del(...keys: string[]): Promise<void> {
    await this.client.del(keys);
  }
}
