import { DynamicModule, Module, Provider } from "@nestjs/common";
import { AuthClient } from "src/modules/auth/port/auth-client.interface";
import { PointGrantExecuter } from "src/modules/point/port/point-grant-executer.interface";
import { PointGrantKeyIssuer } from "src/modules/point/port/point-grant-key-issuer.interface";
import { MockAuthClient } from "./mock/auth/mock-auth.client";
import { MockModule } from "./mock/mock.module";
import { MockPointGrantKeyIssuer } from "./mock/point/mock-point-grant-key.issuer";
import { MockPointGrantExecuter } from "./mock/point/mock-point-grant.executer";
import { TossAuthClient } from "./toss/auth/toss-auth.client";
import { TossHttpClient } from "./toss/common/toss-http.client";
import { TossPointGrantKeyIssuer } from "./toss/point/toss-point-grant-key.issuer";
import { TossPointGrantExecuter } from "./toss/point/toss-point-grant.executer";
import { TossModule } from "./toss/toss.module";

@Module({})
export class ExternalModule {
  static register(): DynamicModule {
    const useMock = process.env.EXTERNAL_API === "mock";

    const providers: Provider[] = useMock
      ? [
          { provide: AuthClient, useClass: MockAuthClient },
          { provide: PointGrantKeyIssuer, useClass: MockPointGrantKeyIssuer },
          { provide: PointGrantExecuter, useClass: MockPointGrantExecuter },
        ]
      : [
          TossHttpClient,
          { provide: AuthClient, useClass: TossAuthClient },
          { provide: PointGrantKeyIssuer, useClass: TossPointGrantKeyIssuer },
          { provide: PointGrantExecuter, useClass: TossPointGrantExecuter },
        ];

    return {
      module: ExternalModule,
      global: true,
      imports: useMock ? [MockModule] : [TossModule],
      providers,
      exports: [AuthClient, PointGrantKeyIssuer, PointGrantExecuter],
    };
  }
}
