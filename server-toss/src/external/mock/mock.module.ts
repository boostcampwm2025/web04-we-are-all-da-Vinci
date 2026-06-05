import { Module } from "@nestjs/common";
import { MockAuthClient } from "./auth/mock-auth.client";
import { MockPointGrantExecuter } from "./point/mock-point-grant.executer";
import { MockPointGrantKeyIssuer } from "./point/mock-point-grant-key.issuer";

@Module({
  providers: [MockAuthClient, MockPointGrantKeyIssuer, MockPointGrantExecuter],
  exports: [MockAuthClient, MockPointGrantKeyIssuer, MockPointGrantExecuter],
})
export class MockModule {}
