import { Migration } from "@mikro-orm/migrations";

export class Migration20260625120000 extends Migration {
  // 연속 출석 중단 알림 스케줄러가 매일 last_checked_date < 오늘 전수를 스캔한다.
  // 유저 수 증가 대비 범위 조회용 인덱스를 추가한다.
  override up(): void {
    this.addSql(
      "alter table `user_attendances` add index `user_attendances_last_checked_date_index` (`last_checked_date`);",
    );
  }

  override down(): void {
    this.addSql(
      "alter table `user_attendances` drop index `user_attendances_last_checked_date_index`;",
    );
  }
}
