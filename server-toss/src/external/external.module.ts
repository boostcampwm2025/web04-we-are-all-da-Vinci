import { DynamicModule, Module, Provider } from "@nestjs/common";
import { AuthClient } from "src/modules/auth/port/auth-client.interface";
import { NotificationSender } from "src/modules/notification/port/notification-sender.interface";
import { PointGrantExecuter } from "src/modules/point/port/point-grant-executer.interface";
import { PointGrantKeyIssuer } from "src/modules/point/port/point-grant-key-issuer.interface";
import { MockAuthClient } from "./mock/auth/mock-auth.client";
import { MockNotificationSender } from "./mock/messenger/mock-notification-sender";
import { MockModule } from "./mock/mock.module";
import { FlakyPointGrantExecuter } from "./mock/point/flaky-point-grant.executer";
import { MockPointGrantKeyIssuer } from "./mock/point/mock-point-grant-key.issuer";
import { MockPointGrantExecuter } from "./mock/point/mock-point-grant.executer";
import { TossAuthClient } from "./toss/auth/toss-auth.client";
import { TossHttpClient } from "./toss/common/toss-http.client";
import { TossNotificationSender } from "./toss/messenger/toss-messenger.client";
import { TossPointGrantKeyIssuer } from "./toss/point/toss-point-grant-key.issuer";
import { TossPointGrantExecuter } from "./toss/point/toss-point-grant.executer";
import { TossModule } from "./toss/toss.module";

@Module({})
export class ExternalModule {
  static register(): DynamicModule {
    const apiMode = process.env.EXTERNAL_API ?? "mock";
    const useToss = apiMode === "toss";
    const useFlaky = apiMode === "flaky";

    const executerClass = useFlaky
      ? FlakyPointGrantExecuter
      : MockPointGrantExecuter;

    const providers: Provider[] = useToss
      ? [
          TossHttpClient,
          { provide: AuthClient, useClass: TossAuthClient },
          { provide: PointGrantKeyIssuer, useClass: TossPointGrantKeyIssuer },
          { provide: PointGrantExecuter, useClass: TossPointGrantExecuter },
          { provide: NotificationSender, useClass: TossNotificationSender },
        ]
      : [
          { provide: AuthClient, useClass: MockAuthClient },
          { provide: PointGrantKeyIssuer, useClass: MockPointGrantKeyIssuer },
          { provide: PointGrantExecuter, useClass: executerClass },
          { provide: NotificationSender, useClass: MockNotificationSender },
        ];

    return {
      module: ExternalModule,
      global: true,
      imports: useToss ? [TossModule] : [MockModule],
      providers,
      exports: [
        AuthClient,
        PointGrantKeyIssuer,
        PointGrantExecuter,
        NotificationSender,
      ],
    };
  }
}
