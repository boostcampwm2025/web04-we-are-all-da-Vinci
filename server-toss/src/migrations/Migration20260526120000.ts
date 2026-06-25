import { Migration } from "@mikro-orm/migrations";

export class Migration20260526120000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      "create table `sent_notifications` (" +
        "`id` bigint unsigned not null auto_increment primary key, " +
        "`created_at` datetime not null, " +
        "`updated_at` datetime not null, " +
        "`user_key` int unsigned not null, " +
        "`type` varchar(32) not null, " +
        "`reference_id` varchar(64) not null, " +
        "`sent_at` datetime not null" +
        ") default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql(
      "alter table `sent_notifications` add unique `uq_sent_notifications_user_type_ref` (`user_key`, `type`, `reference_id`);",
    );
    this.addSql(
      "alter table `sent_notifications` add index `idx_sent_notifications_user_sent_at` (`user_key`, `sent_at`);",
    );
  }

  override down(): void | Promise<void> {
    this.addSql("drop table if exists `sent_notifications`;");
  }
}
