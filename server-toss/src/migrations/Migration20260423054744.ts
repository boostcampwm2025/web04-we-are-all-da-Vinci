import { Migration } from "@mikro-orm/migrations";

export class Migration20260423054744 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`rankings\` change \`total_similarity\` \`score\` double not null;`,
    );

    this.addSql(
      `alter table \`drawings\` change \`total_similarity\` \`score\` double not null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`drawings\` change \`score\` \`total_similarity\` double not null;`,
    );

    this.addSql(
      `alter table \`rankings\` change \`score\` \`total_similarity\` double not null;`,
    );
  }
}
