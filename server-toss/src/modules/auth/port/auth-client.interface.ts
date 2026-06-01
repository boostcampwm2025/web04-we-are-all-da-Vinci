import { LoginDto } from "../dto/login.dto";
import { TossUserInfo } from "../toss-api.client";

export interface AuthClient {
  generateToken(dto: LoginDto): Promise<string>;
  removeAccessByUserKey(userKey: number): Promise<void>;
  getUserInfo(accessToken: string): Promise<TossUserInfo>;
}
