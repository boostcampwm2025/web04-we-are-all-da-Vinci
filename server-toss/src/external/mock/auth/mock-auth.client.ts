import { Injectable } from "@nestjs/common";
import type { LoginDto } from "src/modules/auth/dto/login.dto";
import { AuthClient } from "src/modules/auth/port/auth-client.interface";
import type { TossUserInfo } from "src/external/toss/common/toss-api.types";

@Injectable()
export class MockAuthClient extends AuthClient {
  private userKeyCounter = 1;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generateToken(dto: LoginDto): Promise<string> {
    return Promise.resolve("mock-access-token");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUserInfo(accessToken: string): Promise<TossUserInfo> {
    const userKey = this.userKeyCounter++;
    return Promise.resolve({
      userKey,
      scope: "mock",
      agreedTerms: [],
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeAccessByUserKey(userKey: number): Promise<void> {
    return Promise.resolve();
  }
}
