import { Injectable } from '@nestjs/common';
import { SimilaritySchema, StrokeSchema, z } from '@shared/types';
import { RoundResultEntry, Similarity, Stroke } from 'src/common/types';
import { REDIS_TTL } from '../../common/constants';
import { RedisKeys } from '../redis-keys';
import { RedisService } from '../redis.service';

const PlayerRecordSchema = z.object({
  strokes: z.array(StrokeSchema),
  similarity: SimilaritySchema,
});

type RoundResult = Omit<RoundResultEntry, 'nickname' | 'socketId'>;

@Injectable()
export class GameProgressCacheService {
  constructor(private readonly redisService: RedisService) {}

  async submitRoundResult(
    roomId: string,
    round: number,
    profileId: string,
    strokes: Stroke[],
    similarity: Similarity,
  ) {
    const client = this.redisService.getClient();
    const key = RedisKeys.drawing(roomId, round, profileId);

    const exists = await client.exists(key);

    if (exists) {
      return;
    }

    await client.setEx(key, REDIS_TTL, JSON.stringify({ strokes, similarity }));
  }

  async existsRoundResult(roomId: string, round: number, profileId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.drawing(roomId, round, profileId);

    return (await client.exists(key)) > 0;
  }

  async getRoundResults(roomId: string, round: number): Promise<RoundResult[]> {
    const client = this.redisService.getClient();
    const scanKey = RedisKeys.drawingRoundScan(roomId, round);

    let cursor = '0';
    const keys: string[] = [];
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
    const profileIds = keys.map((key) => key.slice(prefix.length));

    return result
      .map((value, index) => ({
        profileId: profileIds[index],
        value: value,
      }))
      .filter((item): item is { profileId: string; value: string } =>
        Boolean(item.value),
      )
      .map(({ profileId, value }) => ({
        profileId,
        ...PlayerRecordSchema.parse(JSON.parse(value)),
      }));
  }

  async getPlayerResults(
    roomId: string,
    profileId: string,
    totalRounds: number,
  ) {
    const client = this.redisService.getClient();
    const keys = Array.from({ length: totalRounds }, (_, index) =>
      RedisKeys.drawing(roomId, index + 1, profileId),
    );

    // 키가 없으면 빈 배열 반환
    if (keys.length === 0) {
      return [];
    }

    const result = await client.mGet(keys);

    return result
      .map((value, index) => ({
        profileId: profileId,
        value: value,
        round: index + 1,
      }))
      .filter(
        (item): item is { profileId: string; value: string; round: number } =>
          Boolean(item.value),
      )
      .map(({ profileId, value, round }) => ({
        profileId,
        round,
        ...PlayerRecordSchema.parse(JSON.parse(value)),
      }));
  }

  async getHighlight(roomId: string, profileId: string, totalRounds: number) {
    const results = await this.getPlayerResults(roomId, profileId, totalRounds);
    const highlight = results.sort(
      (a, b) => b.similarity.similarity - a.similarity.similarity,
    )[0];
    return highlight;
  }

  async deleteAll(roomId: string) {
    const client = this.redisService.getClient();
    const scanKey = RedisKeys.drawingGameScan(roomId);

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

  async deletePlayer(roomId: string, profileId: string) {
    const client = this.redisService.getClient();
    const scanKey = RedisKeys.drawingPlayerScan(roomId, profileId);

    let cursor = '0';

    do {
      const data = await client.scan(cursor, {
        TYPE: 'string',
        MATCH: scanKey,
      });

      cursor = data.cursor;
      const keys = data.keys;

      if (keys.length > 0) {
        await client.unlink(keys);
      }
    } while (cursor !== '0');
  }

  /**
   * 특정 라운드의 특정 플레이어 결과 삭제 (세션 복구 시 재제출 가능하게)
   */
  async deleteRoundResult(
    roomId: string,
    round: number,
    profileId: string,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const key = RedisKeys.drawing(roomId, round, profileId);

    await client.unlink(key);
  }
}
