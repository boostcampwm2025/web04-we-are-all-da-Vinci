import { Module } from "@nestjs/common";
import { TossAuthClient } from "./auth/toss-auth.client";
import { TossHttpClient } from "./common/toss-http.client";
import { TossPointGrantKeyIssuer } from "./point/toss-point-grant-key.issuer";
import { TossPointGrantExecuter } from "./point/toss-point-grant.executer";

@Module({
  providers: [
    TossHttpClient,
    TossAuthClient,
    TossPointGrantExecuter,
    TossPointGrantKeyIssuer,
  ],
  exports: [TossAuthClient, TossPointGrantExecuter, TossPointGrantKeyIssuer],
})
export class TossModule {}
