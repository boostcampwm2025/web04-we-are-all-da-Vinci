import { Body, Controller, Post } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { CreateRoomSchema } from '@shared/types';
import { GameService } from './game.service';

@Controller()
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(GameController.name);
  }

  @Post('room')
  async createRoom(@Body() body: unknown) {
    const createRoomDto = CreateRoomSchema.parse(body);
    const roomId = await this.gameService.createRoom(createRoomDto);

    this.logger.info({ roomId, settings: createRoomDto }, 'New Room Created');
    return { roomId };
  }
}
