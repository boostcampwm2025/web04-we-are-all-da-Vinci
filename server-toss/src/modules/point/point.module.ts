import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { PointGrantRequest } from "./point-grant-request.entity";
import { PointLog } from "./point-log.entity";
import { PointService } from "./point.service";
import { PointGrantScheduler } from "./point-grant.scheduler";
import { PointGrantPurgeScheduler } from "./point-grant-purge.scheduler";

@Module({
  imports: [MikroOrmModule.forFeature([PointLog, PointGrantRequest])],
  providers: [PointService, PointGrantScheduler, PointGrantPurgeScheduler],
  exports: [PointService],
})
export class PointModule {}
