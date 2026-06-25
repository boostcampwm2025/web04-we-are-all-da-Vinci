import { EntityRepositoryType, type Opt } from "@mikro-orm/core";
import {
  Entity,
  Index,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/entitiy/base.entity";
import { AttendanceRepository } from "./attendance.repository";

// 유저당 1행으로 출석 사이클 상태만 보관하는 카운터 테이블.
@Entity({
  tableName: "user_attendances",
  repository: () => AttendanceRepository,
})
// 연속 출석 중단 알림이 매일 last_checked_date < 오늘 전수 스캔 → 범위 조회용 인덱스.
@Index({
  name: "user_attendances_last_checked_date_index",
  properties: ["lastCheckedDate"],
})
export class Attendance extends BaseEntity {
  [EntityRepositoryType]?: AttendanceRepository;

  @PrimaryKey({
    fieldName: "user_key",
    type: "integer",
    unsigned: true,
    autoincrement: false,
  })
  userKey!: number;

  // 현재 사이클 내 위치(1..ATTENDANCE_CYCLE_LENGTH). 7일 달성 후 다음 출석에서 1로 초기화된다.
  @Property({ fieldName: "cycle_day", type: "int", default: 1 })
  cycleDay: Opt<number> = 1;

  // 마지막 출석 날짜(KST 자정 기준). 오늘/어제와 비교해 연속·끊김을 판정한다.
  @Property({ fieldName: "last_checked_date", type: "datetime" })
  lastCheckedDate!: Date;

  // 오늘 끊김 리셋이 발생했을 때 광고로 복구 가능한 직전 사이클 위치. 그 외엔 null.
  @Property({ fieldName: "recoverable_day", type: "int", nullable: true })
  recoverableDay: number | null = null;
}
