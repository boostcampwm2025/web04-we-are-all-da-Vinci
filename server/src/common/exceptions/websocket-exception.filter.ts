import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ClientEvents } from '../constants';

@Catch(WsException)
export class WebsocketExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();

    const error = exception.getError();

    const body = error instanceof Object ? { ...error } : { message: error };

    client.emit(ClientEvents.ERROR, body);
  }
}
