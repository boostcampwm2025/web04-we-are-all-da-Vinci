import { Migration } from "@mikro-orm/migrations";

export class Migration20260503061818 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(`alter table \`rankings\` drop column \`user_id\`;`);
    this.addSql(`alter table \`rankings\` add \`user_key\` int not null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table \`rankings\` drop column \`user_key\`;`);
    this.addSql(`alter table \`rankings\` add \`user_id\` bigint not null;`);
  }
}
