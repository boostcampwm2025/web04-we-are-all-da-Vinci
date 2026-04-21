import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { User } from "./user.entity";
import { UserService } from "./user.service";

@Module({
  imports: [MikroOrmModule.forFeature([User])],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
