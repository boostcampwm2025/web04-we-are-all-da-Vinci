import { Module } from "@nestjs/common";
import { UserModule } from "src/modules/user/user.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TossApiClient } from "./toss-api.client";

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [AuthService, TossApiClient],
})
export class AuthModule {}
