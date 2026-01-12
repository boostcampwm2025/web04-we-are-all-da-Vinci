import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { RoundResultEntry, Stroke } from 'src/common/types';
import { REDIS_TTL } from 'src/common/constants';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';

interface PlayerRecord {
  strokes: Stroke[];
  similarity: number;
}

type RoundResult = Omit<RoundResultEntry, 'nickname'>;

@Injectable()
export class GameProgressCacheService {
  constructor(private readonly redisService: RedisService) {}

  private getKey(roomId: string, round: number, socketId: string) {
    return `drawing:${roomId}:${round}:${socketId}`;
  }

  private getPlayerScanKey(roomId: string, round: number) {
    return `drawing:${roomId}:${round}:*`;
  }

  async submitRoundResult(
    roomId: string,
    round: number,
    socketId: string,
    strokes: Stroke[],
    similarity: number,
  ) {
    const client = this.redisService.getClient();
    const key = this.getKey(roomId, round, socketId);

    const exists = await client.get(key);

    if (exists) {
      throw new WebsocketException('이미 제출하였습니다.');
    }

    await client.setEx(key, REDIS_TTL, JSON.stringify({ strokes, similarity }));
  }

  async getRoundResults(roomId: string, round: number): Promise<RoundResult[]> {
    const client = this.redisService.getClient();
    const scanKey = this.getPlayerScanKey(roomId, round);

    let cursor = '0';
    const keys = [];
    do {
      const data = await client.scan(cursor, {
        TYPE: 'string',
        COUNT: 20,
        MATCH: scanKey,
      });
      cursor = data.cursor;
      keys.push(...data.keys);
    } while (cursor !== '0');

    const result = await client.mGet(keys);

    const socketIds = keys.map((key) => key.slice(scanKey.length - 1));

    return result
      .map((value, index) => ({
        socketId: socketIds[index],
        value: value,
      }))
      .filter((item): item is { socketId: string; value: string } =>
        Boolean(item.value),
      )
      .map(({ socketId, value }) => ({
        socketId,
        ...(JSON.parse(value) as PlayerRecord),
      }));
  }

  async getPlayerResults(
    roomId: string,
    socketId: string,
    totalRounds: number,
  ) {
    const client = this.redisService.getClient();
    const keys = Array.from({ length: totalRounds }, (_, index) =>
      this.getKey(roomId, index + 1, socketId),
    );

    const result = await client.mGet(keys);

    return result
      .map((value) => ({
        socketId: socketId,
        value: value,
      }))
      .filter((item): item is { socketId: string; value: string } =>
        Boolean(item.value),
      )
      .map(({ socketId, value }) => ({
        socketId,
        ...(JSON.parse(value) as PlayerRecord),
      }));
  }

  async getHighlight(roomId: string, socketId: string, totalRounds: number) {
    const results = await this.getPlayerResults(roomId, socketId, totalRounds);
    const highlight = results
      .map((result, round) => ({ ...result, round: round + 1 }))
      .sort((a, b) => b.similarity - a.similarity)[0];
    return highlight;
  }
}
