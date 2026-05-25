import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { PointGrantRequest } from "./point-grant-request.entity";
import { PointLog } from "./point-log.entity";
import { PointService } from "./point.service";

@Module({
  imports: [MikroOrmModule.forFeature([PointLog, PointGrantRequest])],
  providers: [PointService],
  exports: [PointService],
})
export class PointModule {}
