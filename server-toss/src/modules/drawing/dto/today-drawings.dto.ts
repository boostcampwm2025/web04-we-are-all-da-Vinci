import { ApiProperty } from "@nestjs/swagger";

export class TodayDrawingsDto {
  @ApiProperty({ description: "당일 결과를 불러올 유저의 userId" })
  userId!: string;
}
