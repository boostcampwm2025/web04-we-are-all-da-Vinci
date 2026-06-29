import { Migration } from "@mikro-orm/migrations";

export class Migration20260630000000 extends Migration {
  override up(): void {
    this.addSql("alter table `missions` add column `increment_step` int null;");
    this.addSql(
      "alter table `user_missions` add column `required_count` int null, add column `level` int not null default 0;",
    );
  }

  override down(): void {
    this.addSql("alter table `missions` drop column `increment_step`;");
    this.addSql(
      "alter table `user_missions` drop column `required_count`, drop column `level`;",
    );
  }
}
