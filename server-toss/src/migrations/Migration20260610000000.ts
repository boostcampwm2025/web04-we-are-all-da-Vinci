import { Migration } from "@mikro-orm/migrations";

export class Migration20260610000000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      "alter table `missions` add `progress_period` enum('none', 'day', 'week', 'month') not null default 'none';",
    );
    this.addSql(
      "alter table `user_missions` add `last_progressed_at` datetime null;",
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      "alter table `user_missions` drop column `last_progressed_at`;",
    );
    this.addSql("alter table `missions` drop column `progress_period`;");
  }
}
