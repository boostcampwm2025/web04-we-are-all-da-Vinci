import { Migration } from "@mikro-orm/migrations";

export class Migration20260611000000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      "alter table `users` add `tutorial_completed_at` datetime null;",
    );
  }

  override down(): void | Promise<void> {
    this.addSql("alter table `users` drop column `tutorial_completed_at`;");
  }
}
