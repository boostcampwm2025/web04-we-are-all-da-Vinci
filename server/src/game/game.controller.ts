import { Controller, Post } from '@nestjs/common';
import { GameService } from './game.service';
import { PinoLogger } from 'nestjs-pino';

@Controller()
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(GameController.name);
  }

  @Post('room')
  async createRoom() {
    const roomId = await this.gameService.createRoom();

    this.logger.info({ roomId }, 'New Room Created');
    return { roomId };
  }
}
