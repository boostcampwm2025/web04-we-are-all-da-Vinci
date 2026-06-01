import { LoginDto } from "../dto/login.dto";
import { UserInfo } from "../types/auth.types";

export abstract class AuthClient {
  abstract generateToken(dto: LoginDto): Promise<string>;
  abstract removeAccessByUserKey(userKey: number): Promise<void>;
  abstract getUserInfo(accessToken: string): Promise<UserInfo>;
}
