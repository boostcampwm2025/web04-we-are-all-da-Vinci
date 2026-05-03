import { Migration } from "@mikro-orm/migrations";

export class Migration20260503061818 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`rankings\` drop index \`idx_ranking_score_submit_name\`;`,
    );
    this.addSql(`alter table \`rankings\` drop column \`user_id\`;`);
    this.addSql(`alter table \`rankings\` add \`user_key\` int not null;`);
    this.addSql(
      `alter table \`rankings\` add index \`idx_ranking_score_submit_name\` (\`score\` DESC, \`submitted_at\` ASC, \`name\` ASC);`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`rankings\` drop index \`idx_ranking_score_submit_name\`;`,
    );
    this.addSql(`alter table \`rankings\` drop column \`user_key\`;`);
    this.addSql(`alter table \`rankings\` add \`user_id\` bigint not null;`);
    this.addSql(
      `alter table \`rankings\` add index \`idx_ranking_score_submit_name\` (\`score\` DESC);`,
    );
  }
}
