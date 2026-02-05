import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { PinoLogger } from 'nestjs-pino';
import { Server, Socket } from 'socket.io';
import { getSocketCorsOrigin } from 'src/common/config/cors.util';
import { ClientEvents, ServerEvents } from 'src/common/constants';
import { ErrorCode } from 'src/common/constants/error-code';
import { WebsocketException } from 'src/common/exceptions/websocket-exception';
import type { ChatMessage } from 'src/common/types';
import { ZodError } from 'zod';
import { ChatService } from './chat.service';
import { ServerChatMessageSchema } from './dto/chat-message.dto';

@WebSocketGateway({
  cors: {
    origin: getSocketCorsOrigin(),
    credentials: true,
  },
})
export class ChatGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly logger: PinoLogger,
    private readonly chatService: ChatService,
  ) {
    this.logger.setContext(ChatGateway.name);
  }

  @SubscribeMessage(ServerEvents.CHAT_MESSAGE)
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    try {
      // Zod validation
      const { roomId, message } = ServerChatMessageSchema.parse(payload);

      const chatMessage = await this.chatService.sendMessage(
        roomId,
        client.id,
        message,
      );

      // 방의 모든 참가자에게 브로드캐스트
      this.server.to(roomId).emit(ClientEvents.CHAT_BROADCAST, chatMessage);

      this.logger.info(
        { clientId: client.id, roomId, messageLength: message.length },
        'Chat Message Sent',
      );
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage =
          error.issues[0]?.message || ErrorCode.CHAT_INVALID_MESSAGE;
        client.emit(ClientEvents.CHAT_ERROR, { message: errorMessage });
        this.logger.warn(
          { clientId: client.id, error: errorMessage },
          'Chat Validation Error',
        );
      } else if (error instanceof WebsocketException) {
        // 채팅 에러는 CHAT_ERROR로 해당 유저에게만 전송 (메인화면 이동 없음)
        client.emit(ClientEvents.CHAT_ERROR, { message: error.getError() });
        this.logger.warn(
          { clientId: client.id, error: error.getError() },
          'Chat Error',
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * 시스템 메시지 브로드캐스트 (다른 서비스에서 호출)
   */
  broadcastSystemMessage(roomId: string, chatMessage: ChatMessage): void {
    this.server.to(roomId).emit(ClientEvents.CHAT_BROADCAST, chatMessage);
  }

  /**
   * 채팅 히스토리 전송 (입장 시 호출)
   */
  async sendHistory(client: Socket, roomId: string): Promise<void> {
    const history = await this.chatService.getHistory(roomId);
    client.emit(ClientEvents.CHAT_HISTORY, history);
  }
}
