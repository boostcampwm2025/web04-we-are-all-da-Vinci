import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { RedisKeys } from '../redis-keys';
import { GameRoom, Player, Settings, Phase } from 'src/common/types';
import { REDIS_TTL } from '../../common/constants';

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

  async getRoom(roomId: string): Promise<GameRoom | null> {
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
      phase: data.phase as Phase,
      currentRound: parseInt(data.currentRound),
      settings: JSON.parse(data.settings) as Settings,
    };
  }

  async deleteRoom(roomId: string) {
    const client = this.redisService.getClient();
    await client.unlink(RedisKeys.room(roomId));
    await client.unlink(RedisKeys.players(roomId));
    await client.unlink(RedisKeys.prompts(roomId));
    await client.unlink(RedisKeys.timer(roomId));
    await client.unlink(RedisKeys.waitlist(roomId));
    await client.unlink(RedisKeys.leaderboard(roomId));
    await client.unlink(RedisKeys.standings(roomId));
    await client.sRem(RedisKeys.activeRooms(), roomId);

    let cursor = '0';
    const scanKey = RedisKeys.drawingGameScan(roomId);
    do {
      const data = await client.scan(cursor, {
        TYPE: 'string',
        COUNT: 20,
        MATCH: scanKey,
      });

      cursor = data.cursor;
      if (data.keys.length > 0) {
        await client.unlink(data.keys);
      }
    } while (cursor !== '0');
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

  async deletePlayer(roomId: string, socketId: string) {
    const client = this.redisService.getClient();
    const key = RedisKeys.players(roomId);

    const script = `local key = KEYS[1]
    local socket_id = ARGV[1]

    local players = redis.call("LRANGE", key, 0, -1)
    local length = #players

    if length == 0 then
      return 0
    end

    local target_index = 0
    local target_obj = nil
    local target_raw = nil

    for i, raw in ipairs(players) do
      local obj = cjson.decode(raw)
      if obj.socketId == socket_id then
        target_index = i
        target_obj = obj
        target_raw = raw
        break
      end
    end

    if target_index == 0 then
        return 0
    end

    if target_obj.isHost == true and length > 1 then
        local host_index = 2
        
        local new_raw = players[host_index]
        local new_obj = cjson.decode(new_raw)
        
        new_obj.isHost = true;
        redis.call("LSET", key, 1, cjson.encode(new_obj)); 
    end

    redis.call("LREM", key, 1, target_raw)

    return 1`;
    const res = await client.eval(script, {
      keys: [key],
      arguments: [socketId],
    });

    return res === 1 ? true : false;
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
