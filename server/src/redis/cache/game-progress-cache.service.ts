import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { RoundResultEntry, Stroke } from 'src/common/types';
import { REDIS_TTL } from 'src/common/constants';

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
      .filter(
        (item): item is { socketId: string; value: string } => !item.value,
      )
      .map(({ socketId, value }) => ({
        socketId,
        ...(JSON.parse(value) as PlayerRecord),
      }));
  }

  async getRoundResultOne(
    roomId: string,
    round: number,
    socketId: string,
  ): Promise<RoundResult | null> {
    const client = this.redisService.getClient();
    const key = this.getKey(roomId, round, socketId);

    const result = await client.get(key);

    if (!result) {
      return null;
    }

    return { socketId, ...(JSON.parse(result) as PlayerRecord) };
  }
}
