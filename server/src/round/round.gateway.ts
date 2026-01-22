import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { RoundService } from './round.service';
import { getSocketCorsOrigin } from 'src/common/config/cors.util';

@WebSocketGateway({
  cors: {
    origin: getSocketCorsOrigin(),
    credentials: true,
  },
})
export class RoundGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly roundService: RoundService) {}

  afterInit(server: Server) {
    this.roundService.setServer(server);
  }
}
