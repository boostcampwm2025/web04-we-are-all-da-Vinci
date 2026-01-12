import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { RoundService } from './round.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [],
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
