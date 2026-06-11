import { Migration } from "@mikro-orm/migrations";

export class Migration20260610000000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      "alter table `quests` add `progress_period` enum('none', 'day', 'week', 'month') not null default 'none';",
    );
    this.addSql(
      "alter table `user_quests` add `last_progressed_at` datetime null;",
    );
  }

  override down(): void | Promise<void> {
    this.addSql("alter table `user_quests` drop column `last_progressed_at`;");
    this.addSql("alter table `quests` drop column `progress_period`;");
  }
}
