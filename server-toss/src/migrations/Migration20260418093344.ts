import { Migration } from "@mikro-orm/migrations";

export class Migration20260418093344 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(`alter table \`rankings\` drop column \`similarity\`;`);
    this.addSql(
      `alter table \`rankings\` add \`total_similarity\` double not null;`,
    );

    this.addSql(
      `alter table \`drawings\` add \`total_similarity\` double not null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table \`drawings\` drop column \`total_similarity\`;`);

    this.addSql(`alter table \`rankings\` drop column \`total_similarity\`;`);
    this.addSql(`alter table \`rankings\` add \`similarity\` text not null;`);
  }
}
