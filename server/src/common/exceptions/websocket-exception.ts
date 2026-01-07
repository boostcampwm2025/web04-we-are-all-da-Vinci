import { WsException } from '@nestjs/websockets';

export class WebsocketException extends WsException {
  constructor(error: string | object) {
    super(error);
  }
}
