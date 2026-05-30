import { Migration } from "@mikro-orm/migrations";

export class Migration20260531000000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`user_quests\` add unique index \`user_quests_user_key_quest_id_created_at_unique\` (\`user_key\`, \`quest_id\`, \`created_at\`);`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`user_quests\` drop index \`user_quests_user_key_quest_id_created_at_unique\`;`,
    );
  }
}
