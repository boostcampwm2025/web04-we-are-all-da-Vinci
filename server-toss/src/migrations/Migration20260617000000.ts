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
