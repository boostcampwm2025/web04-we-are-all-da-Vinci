import { Migration } from "@mikro-orm/migrations";

export class Migration20260617000000 extends Migration {
  override up(): void {
    this.addSql(
      "create table `user_attendances` (" +
        "`user_key` int unsigned not null, " +
        "`created_at` datetime not null, " +
        "`updated_at` datetime not null, " +
        "`cycle_day` int not null default 1, " +
        "`last_checked_date` datetime not null, " +
        "`recoverable_day` int null, " +
        "primary key (`user_key`)" +
        ") default character set utf8mb4 engine = InnoDB;",
    );

    this.addSql(
      "alter table `point_logs` modify `point_reason` enum('ad','share','drawing','mission','attendance') not null;",
    );
    this.addSql(
      "alter table `point_grant_requests` modify `point_reason` enum('ad','share','drawing','mission','attendance') not null;",
    );
    this.addSql(
      "alter table `ad_views` modify `ad_type` enum('drawing','attendance_recovery') not null;",
    );
  }

  override down(): void {
    // ENUM 축소 전 신규 값 레코드 정리 — 남아 있으면 MODIFY 시 DB 에러로 롤백이 중단됨.
    this.addSql(
      "delete from `ad_views` where `ad_type` = 'attendance_recovery';",
    );
    this.addSql(
      "delete from `point_grant_requests` where `point_reason` = 'attendance';",
    );
    this.addSql(
      "delete from `point_logs` where `point_reason` = 'attendance';",
    );
    this.addSql(
      "alter table `ad_views` modify `ad_type` enum('drawing') not null;",
    );
    this.addSql(
      "alter table `point_grant_requests` modify `point_reason` enum('ad','share','drawing','mission') not null;",
    );
    this.addSql(
      "alter table `point_logs` modify `point_reason` enum('ad','share','drawing','mission') not null;",
    );
    this.addSql("drop table if exists `user_attendances`;");
  }
}
