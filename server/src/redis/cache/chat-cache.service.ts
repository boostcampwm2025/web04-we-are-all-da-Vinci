import { Injectable } from '@nestjs/common';
import { CHAT_HISTORY_LIMIT, REDIS_TTL } from 'src/common/constants';
import { ChatMessage } from 'src/common/types';
import { RedisKeys } from '../redis-keys';
import { RedisService } from '../redis.service';

@Injectable()
export class ChatCacheService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * 메시지 추가 (LPUSH + LTRIM으로 최대 50개 유지)
   */
  async addMessage(roomId: string, message: ChatMessage): Promise<void> {
    const client = this.redisService.getClient();
    const key = RedisKeys.chat(roomId);

    await client.lPush(key, JSON.stringify(message));
    await client.lTrim(key, 0, CHAT_HISTORY_LIMIT - 1);
    await client.expire(key, REDIS_TTL);
  }

  /**
   * 히스토리 조회 (시간순 정렬 - 오래된 메시지가 먼저)
   */
  async getHistory(roomId: string): Promise<ChatMessage[]> {
    const client = this.redisService.getClient();
    const key = RedisKeys.chat(roomId);

    const messages = await client.lRange(key, 0, CHAT_HISTORY_LIMIT - 1);
    return messages.map((msg) => JSON.parse(msg) as ChatMessage).reverse();
  }

  /**
   * 채팅 히스토리 삭제 (방 삭제 시)
   */
  async clear(roomId: string): Promise<void> {
    const client = this.redisService.getClient();
    const key = RedisKeys.chat(roomId);
    await client.unlink(key);
  }

  /**
   * Rate Limit 확인 및 카운트 증가
   * @returns 허용 여부 (true: 허용, false: 제한)
   */
  async checkAndIncrementRateLimit(
    socketId: string,
    window: 'short' | 'long',
    maxMessages: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const client = this.redisService.getClient();
    const key = RedisKeys.chatRateLimit(socketId, window);

    const current = await client.incr(key);

    if (current === 1) {
      await client.expire(key, windowSeconds);
    }

    const isAllowed = current <= maxMessages;
    return isAllowed;
  }
}
