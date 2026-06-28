import { Module } from "@nestjs/common";
import { MissionModule } from "src/modules/mission/mission.module";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";

@Module({
  imports: [MissionModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
