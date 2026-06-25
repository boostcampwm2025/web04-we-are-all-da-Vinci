import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { AdView } from "../chance/ad-view.entity";
import { PointModule } from "../point/point.module";
import { User } from "../user/user.entity";
import { AttendanceController } from "./attendance.controller";
import { Attendance } from "./attendance.entity";
import { AttendanceService } from "./attendance.service";

@Module({
  imports: [MikroOrmModule.forFeature([Attendance, AdView, User]), PointModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
