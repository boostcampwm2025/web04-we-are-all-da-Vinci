import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { PointLog } from "./point-log.entity";
import { PointService } from "./point.service";

@Module({
  imports: [MikroOrmModule.forFeature([PointLog])],
  providers: [PointService],
  exports: [PointService],
})
export class PointModule {}
