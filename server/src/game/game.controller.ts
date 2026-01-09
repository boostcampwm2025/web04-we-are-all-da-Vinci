import { Body, Controller, Post } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { CreateRoomDto } from './dto/create-room.dto';
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
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    const roomId = await this.gameService.createRoom(createRoomDto);

    this.logger.info({ roomId, settings: createRoomDto }, 'New Room Created');
    return { roomId };
  }
}
