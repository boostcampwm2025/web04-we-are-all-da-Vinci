import { ApiProperty } from "@nestjs/swagger";

export class LoginResponseDto {
  @ApiProperty({ description: "토스 사용자 고유 키" })
  userKey!: number;
}
