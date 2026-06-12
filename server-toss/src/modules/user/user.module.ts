import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { MissionModule } from "src/modules/mission/mission.module";
import { User } from "./user.entity";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";

@Module({
  imports: [MikroOrmModule.forFeature([User]), MissionModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
