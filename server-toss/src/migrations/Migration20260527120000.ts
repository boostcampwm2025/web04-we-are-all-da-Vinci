import { Migration } from "@mikro-orm/migrations";

export class Migration20260527120000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      "create table `notification_agreements` (" +
        "`id` bigint unsigned not null auto_increment primary key, " +
        "`created_at` datetime not null, " +
        "`updated_at` datetime not null, " +
        "`user_key` int unsigned not null, " +
        "`type` varchar(32) not null, " +
        "`template_code` varchar(128) not null, " +
        "`status` varchar(16) not null, " +
        "`agreed_at` datetime null, " +
        "`rejected_at` datetime null, " +
        "`last_event_at` datetime not null" +
        ") default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql(
      "alter table `notification_agreements` add unique `uq_notification_agreements_user_type_template` (`user_key`, `type`, `template_code`);",
    );
    this.addSql(
      "alter table `notification_agreements` add index `idx_notification_agreements_type_status` (`type`, `status`);",
    );
  }

  override down(): void | Promise<void> {
    this.addSql("drop table if exists `notification_agreements`;");
  }
}
