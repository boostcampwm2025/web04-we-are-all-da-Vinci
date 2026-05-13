import { MikroOrmModule } from "@mikro-orm/nestjs";
import { forwardRef, Module } from "@nestjs/common";
import { DailyPrompt } from "./daily-prompt.entity";
import { Prompt } from "./prompt.entity";
import { PromptSeedService } from "./prompt.seed";
import { PromptService } from "./prompt.service";
import { DrawingModule } from "../drawing/drawing.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [
    MikroOrmModule.forFeature([Prompt, DailyPrompt]),
    forwardRef(() => DrawingModule),
    UserModule,
  ],
  providers: [PromptService, PromptSeedService],
  exports: [PromptService],
})
export class PromptModule {}
