import { Migration } from "@mikro-orm/migrations";

export class Migration20261020000000 extends Migration {
  override up(): void {
    this.addSql(
      "alter table `point_grant_requests` add `version` int not null default 1;",
    );
  }

  override down(): void {
    this.addSql("alter table `point_grant_requests` drop column `version`;");
  }
}
