import { Injectable } from '@nestjs/common';
import { ChatCacheService } from 'src/redis/cache/chat-cache.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { PlayerCacheService } from 'src/redis/cache/player-cache.service';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import { ErrorCode } from 'src/common/constants/error-code';
import {
  ChatMessage,
  SystemMessageType,
  ChatHistoryPayload,
} from 'src/common/types';
import {
  CHAT_RATE_LIMIT_SHORT,
  CHAT_RATE_LIMIT_LONG,
} from 'src/common/constants';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatCacheService: ChatCacheService,
    private readonly gameRoomCacheService: GameRoomCacheService,
    private readonly playerCacheService: PlayerCacheService,
  ) {}

  /**
   * 사용자 메시지 전송
   * 메시지 길이/형식 검증은 Gateway의 Zod 스키마에서 처리됨
   */
  async sendMessage(
    roomId: string,
    socketId: string,
    message: string,
  ): Promise<ChatMessage> {
    // 1. 플레이어가 방에 있는지 확인
    const playerRoomId = await this.playerCacheService.getRoomId(socketId);
    if (playerRoomId !== roomId) {
      throw new WebsocketException(ErrorCode.CHAT_PLAYER_NOT_IN_ROOM);
    }

    // 2. Rate Limit 검증 (단기 + 장기)
    const shortResult = await this.chatCacheService.checkAndIncrementRateLimit(
      socketId,
      'short',
      CHAT_RATE_LIMIT_SHORT.messages,
      CHAT_RATE_LIMIT_SHORT.seconds,
    );
    const longResult = await this.chatCacheService.checkAndIncrementRateLimit(
      socketId,
      'long',
      CHAT_RATE_LIMIT_LONG.messages,
      CHAT_RATE_LIMIT_LONG.seconds,
    );

    if (!shortResult.allowed || !longResult.allowed) {
      const retryAfter = Math.max(
        shortResult.retryAfter,
        longResult.retryAfter,
      );
      throw new WebsocketException(
        `메시지를 너무 빠르게 보내고 있습니다. ${retryAfter}초 후에 다시 시도해주세요.`,
      );
    }

    // 3. 플레이어 정보 조회
    const players = await this.gameRoomCacheService.getAllPlayers(roomId);
    const player = players.find((p) => p.socketId === socketId);

    if (!player) {
      throw new WebsocketException(ErrorCode.CHAT_PLAYER_NOT_IN_ROOM);
    }

    // 4. ChatMessage 객체 생성
    const chatMessage: ChatMessage = {
      type: 'user',
      socketId,
      nickname: player.nickname,
      profileId: player.profileId,
      message,
      timestamp: Date.now(),
    };

    // 5. Redis에 저장
    await this.chatCacheService.addMessage(roomId, chatMessage);

    return chatMessage;
  }

  /**
   * 채팅 히스토리 조회
   */
  async getHistory(roomId: string): Promise<ChatHistoryPayload> {
    const messages = await this.chatCacheService.getHistory(roomId);
    return { roomId, messages };
  }

  /**
   * 시스템 메시지 생성 및 저장
   */
  async createSystemMessage(
    roomId: string,
    systemType: SystemMessageType,
    message: string,
  ): Promise<ChatMessage> {
    const chatMessage: ChatMessage = {
      type: 'system',
      message,
      timestamp: Date.now(),
      systemType,
    };

    await this.chatCacheService.addMessage(roomId, chatMessage);

    return chatMessage;
  }

  /**
   * 입장 시스템 메시지 생성
   */
  async createJoinMessage(
    roomId: string,
    nickname: string,
  ): Promise<ChatMessage> {
    return this.createSystemMessage(
      roomId,
      'join',
      `${nickname}님이 입장했습니다.`,
    );
  }

  /**
   * 퇴장 시스템 메시지 생성
   */
  async createLeaveMessage(
    roomId: string,
    nickname: string,
  ): Promise<ChatMessage> {
    return this.createSystemMessage(
      roomId,
      'leave',
      `${nickname}님이 퇴장했습니다.`,
    );
  }

  /**
   * 강퇴 시스템 메시지 생성
   */
  async createKickMessage(
    roomId: string,
    nickname: string,
  ): Promise<ChatMessage> {
    return this.createSystemMessage(
      roomId,
      'kick',
      `${nickname}님이 강퇴되었습니다.`,
    );
  }

  /**
   * 방장 변경 시스템 메시지 생성
   */
  async createHostChangeMessage(
    roomId: string,
    newHostNickname: string,
  ): Promise<ChatMessage> {
    return this.createSystemMessage(
      roomId,
      'host_change',
      `${newHostNickname}님이 새로운 방장이 되었습니다.`,
    );
  }

  /**
   * 채팅 히스토리 삭제 (방 삭제 시)
   */
  async clearHistory(roomId: string): Promise<void> {
    await this.chatCacheService.clear(roomId);
  }
}
