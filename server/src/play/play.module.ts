import { Module } from '@nestjs/common';
import { PlayGateway } from './play.gateway';

@Module({
  providers: [PlayGateway],
})
export class PlayModule {}
