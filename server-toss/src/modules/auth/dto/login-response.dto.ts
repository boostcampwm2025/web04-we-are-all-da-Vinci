import { ApiProperty } from "@nestjs/swagger";

export class LoginResponseDto {
  @ApiProperty({ description: "JWT 액세스 토큰" })
  accessToken!: string;
}
