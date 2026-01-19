import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { RoundResultEntry, Similarity, Stroke } from 'src/common/types';
import { REDIS_TTL } from 'src/common/constants';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';

interface PlayerRecord {
  strokes: Stroke[];
  similarity: Similarity;
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

  private getGameScanKey(roomId: string) {
    return `drawing:${roomId}:*`;
  }

  async submitRoundResult(
    roomId: string,
    round: number,
    socketId: string,
    strokes: Stroke[],
    similarity: Similarity,
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

    // 키가 없으면 빈 배열 반환
    if (keys.length === 0) {
      return [];
    }

    const result = await client.mGet(keys);

    const prefix = `drawing:${roomId}:${round}:`;
    const socketIds = keys.map((key) => key.slice(prefix.length));

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

    // 키가 없으면 빈 배열 반환
    if (keys.length === 0) {
      return [];
    }

    const result = await client.mGet(keys);

    return result
      .map((value, index) => ({
        socketId: socketId,
        value: value,
        round: index + 1,
      }))
      .filter(
        (item): item is { socketId: string; value: string; round: number } =>
          Boolean(item.value),
      )
      .map(({ socketId, value, round }) => ({
        socketId,
        round,
        ...(JSON.parse(value) as PlayerRecord),
      }));
  }

  async getHighlight(roomId: string, socketId: string, totalRounds: number) {
    const results = await this.getPlayerResults(roomId, socketId, totalRounds);
    const highlight = results.sort(
      (a, b) => b.similarity.similarity - a.similarity.similarity,
    )[0];
    return highlight;
  }

  async deleteAll(roomId: string) {
    const client = this.redisService.getClient();
    const scanKey = this.getGameScanKey(roomId);

    let cursor = '0';
    do {
      const data = await client.scan(cursor, {
        TYPE: 'string',
        COUNT: 20,
        MATCH: scanKey,
      });
      cursor = data.cursor;
      const keys = data.keys;

      if (keys.length > 0) {
        await client.unlink(keys);
      }
    } while (cursor !== '0');
  }
}
