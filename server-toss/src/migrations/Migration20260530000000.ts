import { Migration } from "@mikro-orm/migrations";

export class Migration20260530000000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`quests\` modify \`objective_type\` enum('submit','score','penalty','daily_submit','daily_score','quest_completed') not null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`quests\` modify \`objective_type\` enum('submit','score','quest_completed') not null;`,
    );
  }
}
