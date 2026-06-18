import { AuthLoginRequest, UserInfo } from "../types/auth.types";

export abstract class AuthClient {
  abstract generateToken(request: AuthLoginRequest): Promise<string>;
  abstract removeAccessByUserKey(userKey: number): Promise<void>;
  abstract getUserInfo(accessToken: string): Promise<UserInfo>;
}
