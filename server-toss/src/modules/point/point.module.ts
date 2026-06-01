import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { PointGrantRequest } from "./entity/point-grant-request.entity";
import { PointLog } from "./entity/point-log.entity";
import { PointService } from "./point.service";
import { PointGrantPurgeScheduler } from "./scheduler/point-grant-purge.scheduler";
import { PointGrantScheduler } from "./scheduler/point-grant.scheduler";
@Module({
  imports: [MikroOrmModule.forFeature([PointLog, PointGrantRequest])],
  providers: [PointService, PointGrantScheduler, PointGrantPurgeScheduler],
  exports: [PointService],
})
export class PointModule {}
