import { EntityRepository } from "@mikro-orm/mysql";
import { Attendance } from "./attendance.entity";

export class AttendanceRepository extends EntityRepository<Attendance> {
  /**
   * 마지막 출석일이 기준 시각(보통 오늘 KST 시작) 이전인 사용자 전수.
   * = 오늘 아직 체크인하지 않은 사용자(어제·그저께·장기 휴면 모두 포함).
   * 연속 출석 중단 알림 발송 대상 조회용. userKey만 select.
   */
  async findUserKeysByLastCheckedBefore(before: Date): Promise<number[]> {
    const rows = await this.em.find(
      Attendance,
      { lastCheckedDate: { $lt: before } },
      { fields: ["userKey"], disableIdentityMap: true },
    );
    return rows.map((row) => row.userKey);
  }
}
