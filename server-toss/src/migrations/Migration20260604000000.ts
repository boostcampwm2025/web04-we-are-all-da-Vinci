import { Migration } from "@mikro-orm/migrations";

export class Migration20260604000000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`quests\` modify \`period\` enum('daily','weekly','tutorial') not null;`,
    );
    this.addSql(
      `alter table \`quests\` modify \`objective_type\` enum('submit','score','penalty','daily_submit','daily_score','quest_completed','visit_ranking','visit_podium','visit_quest_tab','visit_drawing_detail','share','retry','tutorial_completed') not null;`,
    );
    this.addSql(
      `alter table \`quests\` add column \`category\` varchar(20) null after \`reward_amount\`;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `delete from \`user_quests\` where \`quest_id\` in (select \`id\` from \`quests\` where \`period\` = 'tutorial');`,
    );
    this.addSql(`delete from \`quests\` where \`period\` = 'tutorial';`);
    this.addSql(`alter table \`quests\` drop column \`category\`;`);
    this.addSql(
      `alter table \`quests\` modify \`objective_type\` enum('submit','score','penalty','daily_submit','daily_score','quest_completed') not null;`,
    );
    this.addSql(
      `alter table \`quests\` modify \`period\` enum('daily','weekly') not null;`,
    );
  }
}
