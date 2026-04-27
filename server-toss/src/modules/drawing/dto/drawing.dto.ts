import { ApiProperty } from "@nestjs/swagger";

export class DrawingMeDto {
  @ApiProperty({ description: "당일 결과를 불러올 유저의 userId" })
  userId!: string;
}

export class DrawingUserDto {
  @ApiProperty({ description: "조회할 유저의 userId" })
  userId!: string;
}
