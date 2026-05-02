import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { DailyPrompt } from "./daily-prompt.entity";
import { PromptController } from "./prompt.controller";
import { Prompt } from "./prompt.entity";
import { PromptSeedService } from "./prompt.seed";
import { PromptService } from "./prompt.service";

@Module({
  imports: [MikroOrmModule.forFeature([Prompt, DailyPrompt])],
  controllers: [PromptController],
  providers: [PromptService, PromptSeedService],
  exports: [PromptService],
})
export class PromptModule {}
