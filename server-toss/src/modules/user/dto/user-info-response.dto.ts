import { ApiProperty } from "@nestjs/swagger";

export class UserInfoResponseDto {
  @ApiProperty({ description: "토스 사용자 고유 키" })
  userKey!: number;

  @ApiProperty({ description: "이름" })
  name!: string;

  @ApiProperty({ description: "닉네임" })
  nickname!: string;

  @ApiProperty({ description: "성별", required: false })
  gender?: string;

  @ApiProperty({ description: "생년월일", required: false })
  birthday?: Date;
}
