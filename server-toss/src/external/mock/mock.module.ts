import { Module } from "@nestjs/common";
import { MockAuthClient } from "./auth/mock-auth.client";
import { FlakyPointGrantExecuter } from "./point/flaky-point-grant.executer";
import { MockNotificationSender } from "./messenger/mock-notification-sender";
import { MockPointGrantExecuter } from "./point/mock-point-grant.executer";
import { MockPointGrantKeyIssuer } from "./point/mock-point-grant-key.issuer";

@Module({
  providers: [
    MockAuthClient,
    MockPointGrantKeyIssuer,
    MockPointGrantExecuter,
    FlakyPointGrantExecuter,
    MockNotificationSender,
  ],
  exports: [
    MockAuthClient,
    MockPointGrantKeyIssuer,
    MockPointGrantExecuter,
    FlakyPointGrantExecuter,
    MockNotificationSender,
  ],
})
export class MockModule {}
