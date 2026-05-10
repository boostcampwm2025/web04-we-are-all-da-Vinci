import { Migration } from "@mikro-orm/migrations";

export class Migration20260509000000 extends Migration {
  override async up(): Promise<void> {
    await this.execute(
      "alter table `play_chances` add column `last_reset_at` date null;",
    );
    await this.execute(
      "update `play_chances` set `last_reset_at` = current_date() where `last_reset_at` is null;",
    );
    await this.execute(
      "alter table `play_chances` modify column `last_reset_at` date not null;",
    );

    await this.execute(
      "create table `share_logs` (" +
        "`id` bigint unsigned not null auto_increment, " +
        "`user_key` int unsigned not null, " +
        "`channel` varchar(20) not null, " +
        "`module_id` varchar(64) null, " +
        "`created_at` timestamp not null, " +
        "`updated_at` timestamp not null, " +
        "primary key (`id`), " +
        "index `idx_share_logs_user_created` (`user_key`, `created_at`), " +
        "constraint `fk_share_logs_user` foreign key (`user_key`) references `users` (`user_key`)" +
        ") default character set utf8mb4 engine = InnoDB;",
    );
  }

  override async down(): Promise<void> {
    await this.execute("drop table if exists `share_logs`;");
    await this.execute(
      "alter table `play_chances` drop column `last_reset_at`;",
    );
  }
}
