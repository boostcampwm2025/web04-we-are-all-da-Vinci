import { Injectable } from "@nestjs/common";
import { AuthClient } from "src/modules/auth/port/auth-client.interface";
import type {
  AuthLoginRequest,
  UserInfo,
} from "src/modules/auth/types/auth.types";

@Injectable()
export class MockAuthClient extends AuthClient {
  private userKeyCounter = 1;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generateToken(request: AuthLoginRequest): Promise<string> {
    return Promise.resolve("mock-access-token");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUserInfo(accessToken: string): Promise<UserInfo> {
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
