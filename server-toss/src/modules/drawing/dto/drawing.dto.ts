import { ApiProperty } from "@nestjs/swagger";

export class DrawingUserDto {
  @ApiProperty({ description: "조회할 사용자 id" })
  userId!: string;
}
