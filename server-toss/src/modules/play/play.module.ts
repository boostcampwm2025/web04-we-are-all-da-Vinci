import { Module } from "@nestjs/common";
import { ChanceModule } from "../chance/chance.module";
import { PromptModule } from "../prompt/prompt.module";
import { PlayController } from "./play.controller";
import { PlayService } from "./play.service";

@Module({
  imports: [ChanceModule, PromptModule],
  controllers: [PlayController],
  providers: [PlayService],
})
export class PlayModule {}
