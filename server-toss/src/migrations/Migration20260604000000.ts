import { Migration } from "@mikro-orm/migrations";

export class Migration20260604000000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`missions\` modify \`period\` enum('daily','weekly','tutorial') not null;`,
    );
    this.addSql(
      `alter table \`missions\` modify \`objective_type\` enum('submit','score','penalty','daily_submit','daily_score','mission_completed','visit_ranking','visit_podium','visit_mission_tab','visit_drawing_detail','share','retry','tutorial_completed') not null;`,
    );
    this.addSql(
      `alter table \`missions\` add column \`category\` varchar(20) null after \`reward_amount\`;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `delete from \`user_missions\` where \`mission_id\` in (select \`id\` from \`missions\` where \`period\` = 'tutorial');`,
    );
    this.addSql(`delete from \`missions\` where \`period\` = 'tutorial';`);
    this.addSql(`alter table \`missions\` drop column \`category\`;`);
    this.addSql(
      `alter table \`missions\` modify \`objective_type\` enum('submit','score','penalty','daily_submit','daily_score','mission_completed') not null;`,
    );
    this.addSql(
      `alter table \`missions\` modify \`period\` enum('daily','weekly') not null;`,
    );
  }
}
