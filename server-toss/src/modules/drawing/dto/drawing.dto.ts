import { ApiProperty } from "@nestjs/swagger";

export class DrawingDetailDto {
  @ApiProperty({ description: "조회할 그림 id" })
  drawingId!: string;
}
