import { Module } from "@nestjs/common";
import { MockAuthClient } from "./auth/mock-auth.client";
import { MockNotificationSender } from "./messenger/mock-notification-sender";
import { MockPointGrantExecuter } from "./point/mock-point-grant.executer";
import { MockPointGrantKeyIssuer } from "./point/mock-point-grant-key.issuer";

@Module({
  providers: [
    MockAuthClient,
    MockPointGrantKeyIssuer,
    MockPointGrantExecuter,
    MockNotificationSender,
  ],
  exports: [
    MockAuthClient,
    MockPointGrantKeyIssuer,
    MockPointGrantExecuter,
    MockNotificationSender,
  ],
})
export class MockModule {}
