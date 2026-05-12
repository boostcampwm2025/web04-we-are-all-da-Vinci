import { Migration } from "@mikro-orm/migrations";

export class Migration20260509000000 extends Migration {
  override async up(): Promise<void> {
    await this.execute(
      "create table if not exists `play_chances` (" +
        "`user_key` int unsigned not null, " +
        "`count` int not null default 0, " +
        "`last_reset_at` date not null, " +
        "primary key (`user_key`)" +
        ") default character set utf8mb4 engine = InnoDB;",
    );

    await this.execute(
      "set @col_exists := (" +
        "select count(*) from information_schema.columns " +
        "where table_schema = database() " +
        "and table_name = 'play_chances' " +
        "and column_name = 'last_reset_at');",
    );
    await this.execute(
      "set @ddl := if(@col_exists = 0, " +
        "'alter table `play_chances` add column `last_reset_at` date null', " +
        "'select 1');",
    );
    await this.execute("prepare stmt from @ddl;");
    await this.execute("execute stmt;");
    await this.execute("deallocate prepare stmt;");

    await this.execute(
      "update `play_chances` set `last_reset_at` = current_date() where `last_reset_at` is null;",
    );
    await this.execute(
      "alter table `play_chances` modify column `last_reset_at` date not null;",
    );

    await this.execute(
      "create table if not exists `share_logs` (" +
        "`id` bigint unsigned not null auto_increment, " +
        "`user_key` int unsigned not null, " +
        "`channel` enum('contactsViral') not null, " +
        "`module_id` varchar(64) null, " +
        "`created_at` timestamp not null, " +
        "`updated_at` timestamp not null, " +
        "primary key (`id`), " +
        "index `share_logs_user_key_index` (`user_key`), " +
        "index `share_logs_user_key_created_at_index` (`user_key`, `created_at`), " +
        "constraint `share_logs_user_key_foreign` foreign key (`user_key`) references `users` (`user_key`)" +
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
