import { Migration } from "@mikro-orm/migrations";

export class Migration20260529000000 extends Migration {
  override up(): void {
    this.addSql(
      "create table `daily_user_rankings` (`id` bigint unsigned not null auto_increment primary key, `created_at` timestamp not null, `updated_at` timestamp not null, `ranking_date` date not null, `user_key` int unsigned not null, `nickname` varchar(20) not null, `drawing_id` bigint not null, `score` double not null, `rank` int unsigned not null, `participant_count` int unsigned not null, `submitted_at` datetime not null) default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql(
      "alter table `daily_user_rankings` add unique `daily_user_rankings_date_user_unique` (`ranking_date`, `user_key`);",
    );
  }

  override down(): void {
    this.addSql("drop table if exists `daily_user_rankings`;");
  }
}
