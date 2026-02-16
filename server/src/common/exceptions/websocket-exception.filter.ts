import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ClientEvents } from '../constants';
import { InternalError } from './internal-error';
import { WebsocketException } from './websocket-exception';
import { ErrorCode } from '../constants/error-code';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class WebsocketExceptionFilter extends BaseWsExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    super();
    this.logger.setContext(WebsocketExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();

    const normalizedException = this.normalizeException(exception);

    this.logger.error(
      { clientId: client.id, error: normalizedException },
      'Websocket Exception',
    );

    const errorResponse = {
      message: normalizedException.message,
    };

    client.emit(ClientEvents.ERROR, errorResponse);
  }

  private normalizeException(exception: unknown): WebsocketException {
    if (exception instanceof WebsocketException) {
      return exception;
    }

    if (exception instanceof WsException) {
      return new WebsocketException(exception);
    }

    if (exception instanceof InternalError) {
      return new WebsocketException(exception);
    }

    return new WebsocketException(ErrorCode.INTERNAL_ERROR);
  }
}
