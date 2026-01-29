import { Injectable } from '@nestjs/common';
import { REDIS_TTL } from 'src/common/constants';
import { GameRoom, Player, Settings } from 'src/common/types';
import { RedisKeys } from '../redis-keys';
import { RedisService } from '../redis.service';

@Injectable()
export class GameRoomCacheService {
  constructor(private readonly redisService: RedisService) {}

  async saveRoom(roomId: string, gameRoom: GameRoom) {
    const client = this.redisService.getClient();
    const key = RedisKeys.room(roomId);

    await client.hSet(key, {
      roomId,
      phase: gameRoom.phase,
      currentRound: String(gameRoom.currentRound),
      settings: JSON.stringify(gameRoom.settings),
    });

    await client.expire(key, REDIS_TTL);
    await client.sAdd(RedisKeys.activeRooms(), roomId);
  }

  async getRoom(roomId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.room(roomId);
    const data = await client.hGetAll(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    const players = await this.getAllPlayers(roomId);

    return {
      roomId: data.roomId,
      players: players,
      phase: data.phase,
      currentRound: parseInt(data.currentRound),
      settings: JSON.parse(data.settings) as Settings,
    };
  }

  async deleteRoom(roomId: string) {
    const client = this.redisService.getClient();
    await client.del(RedisKeys.room(roomId));
    await client.del(RedisKeys.players(roomId));
    await client.del(RedisKeys.prompts(roomId));
    await client.del(RedisKeys.timer(roomId));
    await client.del(RedisKeys.waitlist(roomId));
    await client.del(RedisKeys.leaderboard(roomId));
    await client.del(RedisKeys.standings(roomId));
    await client.sRem(RedisKeys.activeRooms(), roomId);

    // drawing:roomId:* 패턴 키 삭제
    const drawingKeys = await client.keys(RedisKeys.drawingGameScan(roomId));
    if (drawingKeys.length > 0) {
      await client.del(drawingKeys);
    }
  }

  async addPlayer(roomId: string, player: Player) {
    const client = this.redisService.getClient();
    const key = RedisKeys.players(roomId);

    await client.rPush(key, JSON.stringify(player));

    await client.expire(key, REDIS_TTL);
  }

  async setPlayer(roomId: string, index: number, player: Player) {
    const client = this.redisService.getClient();
    const key = RedisKeys.players(roomId);

    await client.lSet(key, index, JSON.stringify(player));

    await client.expire(key, REDIS_TTL);
  }

  async deletePlayer(roomId: string, player: Player) {
    const client = this.redisService.getClient();
    const key = RedisKeys.players(roomId);

    await client.lRem(key, 0, JSON.stringify(player));
  }

  async getAllPlayers(roomId: string): Promise<Player[]> {
    const client = this.redisService.getClient();
    const key = RedisKeys.players(roomId);

    return (await client.lRange(key, 0, -1)).map(
      (value) => JSON.parse(value) as Player,
    );
  }

  async addPromptIds(roomId: string, ...promptIds: number[]) {
    const client = this.redisService.getClient();
    const key = RedisKeys.prompts(roomId);

    const values = promptIds.map((id) => String(id));

    await client.rPush(key, values);
    await client.expire(key, REDIS_TTL);
  }

  async resetPromptIds(roomId: string, ...promptIds: number[]) {
    const client = this.redisService.getClient();
    const key = RedisKeys.prompts(roomId);

    const values = promptIds.map((id) => String(id));

    await client.unlink(key);
    await client.rPush(key, values);
    await client.expire(key, REDIS_TTL);
  }

  async getPromptId(roomId: string, round: number): Promise<number | null> {
    if (round < 1) {
      return null;
    }

    const client = this.redisService.getClient();
    const key = RedisKeys.prompts(roomId);

    const promptId = await client.lIndex(key, round - 1);

    return promptId !== null ? parseInt(promptId) : promptId;
  }

  async popAndAddPlayerAtomically(roomId: string): Promise<Player | null> {
    const client = this.redisService.getClient();
    const roomKey = RedisKeys.room(roomId);
    const playerListKey = RedisKeys.players(roomId);
    const waitlistKey = RedisKeys.waitlist(roomId);

    const luaScript = `
      local roomKey = KEYS[1]
      local playerListKey = KEYS[2]
      local waitlistKey = KEYS[3]
      local ttl = tonumber(ARGV[1])

      local settingsJson = redis.call('HGET', roomKey, 'settings')
      if not settingsJson then return nil end
      
      local settings = cjson.decode(settingsJson)
      local maxPlayer = tonumber(settings.maxPlayer)
      local currentCount = redis.call('LLEN', playerListKey)

      if currentCount < maxPlayer then
          local playerJson = redis.call('LPOP', waitlistKey)
          if playerJson then
              local player = cjson.decode(playerJson)
              player.isHost = (currentCount == 0)
              local updatedJson = cjson.encode(player)
              redis.call('RPUSH', playerListKey, updatedJson)
              redis.call('EXPIRE', playerListKey, ttl)
              return updatedJson
          end
      end
      return nil
    `;

    const result = await client.eval(luaScript, {
      keys: [roomKey, playerListKey, waitlistKey],
      arguments: [String(REDIS_TTL)],
    });

    return result ? (JSON.parse(result as string) as Player) : null;
  }
}
