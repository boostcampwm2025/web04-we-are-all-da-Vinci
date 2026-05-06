import { ApiProperty } from "@nestjs/swagger";

export class LoginResponseDto {
  @ApiProperty({ description: "JWT 액세스 토큰" })
  accessToken!: string;

  @ApiProperty({ description: "자동 생성된 닉네임" })
  nickname!: string;
}
