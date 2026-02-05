import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ClientEvents } from '../constants';
import { InternalError } from './internal-error';
import { WebsocketException } from './websocket-exception';
import { ErrorCode } from '../constants/error-code';
import { PinoLogger } from 'nestjs-pino';

@Catch(WsException, InternalError)
export class WebsocketExceptionFilter extends BaseWsExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    super();
    this.logger.setContext(WebsocketExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();

    if (exception instanceof InternalError) {
      this.logger.error(
        { clientId: client.id, exception },
        'Websocket Exception',
      );
      const errorResponse = {
        message: exception.message,
      };
      client.emit(ClientEvents.ERROR, errorResponse);
      return;
    }

    if (exception instanceof WebsocketException) {
      this.logger.error(
        { clientId: client.id, exception },
        'Websocket Exception',
      );
      const errorResponse = {
        message: exception.message,
      };
      client.emit(ClientEvents.ERROR, errorResponse);
      return;
    }

    if (exception instanceof WsException) {
      super.catch(new WebsocketException(exception), host);
    }

    super.catch(new WebsocketException(ErrorCode.INTERNAL_ERROR), host);
  }
}
