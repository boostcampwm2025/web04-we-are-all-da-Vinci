import { DynamicModule, Module, Provider } from "@nestjs/common";
import { AuthClient } from "src/modules/auth/port/auth-client.interface";
import { TossHttpClient } from "./toss/common/toss-http.client";
import { TossAuthClient } from "./toss/auth/toss-auth.client";
import { PointGrantKeyIssuer } from "src/modules/point/port/point-grant-key-issuer.interface";
import { TossPointGrantKeyIssuer } from "./toss/point/toss-point-grant-key.issuer";
import { PointGrantExecuter } from "src/modules/point/port/point-grant-executer.interface";
import { TossPointGrantExecuter } from "./toss/point/toss-point-grant.executer";
import { TossModule } from "./toss/toss.module";

@Module({})
export class ExternalModule {
  static register(): DynamicModule {
    const providers: Provider[] = [
      TossHttpClient,
      {
        provide: AuthClient,
        useClass: TossAuthClient,
      },
      {
        provide: PointGrantKeyIssuer,
        useClass: TossPointGrantKeyIssuer,
      },
      {
        provide: PointGrantExecuter,
        useClass: TossPointGrantExecuter,
      },
    ];

    return {
      module: ExternalModule,
      imports: [TossModule],
      providers,
      exports: [AuthClient, PointGrantKeyIssuer, PointGrantExecuter],
    };
  }
}
