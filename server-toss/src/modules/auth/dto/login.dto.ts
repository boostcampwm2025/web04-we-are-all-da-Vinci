import { ApiProperty } from "@nestjs/swagger";
import { z } from "zod";

export const LoginSchema = z.object({
  authorizationCode: z.string().min(1),
  referrer: z.enum(["DEFAULT", "SANDBOX"]),
});

export class LoginDto {
  @ApiProperty({ description: "appLogin()에서 받은 인가 코드" })
  authorizationCode!: string;

  @ApiProperty({
    description: "앱 환경 구분",
    enum: ["DEFAULT", "SANDBOX"],
  })
  referrer!: "DEFAULT" | "SANDBOX";
}
