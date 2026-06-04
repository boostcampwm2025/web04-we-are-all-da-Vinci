import { Migration } from "@mikro-orm/migrations";

export class Migration20260604123327 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table \`quests\` modify \`category\` varchar(255) null;`,
    );

    this.addSql(
      `alter table \`point_logs\` modify \`point_reason\` enum('ad','share','drawing','quest') not null;`,
    );

    this.addSql(
      `alter table \`point_grant_requests\` modify \`point_reason\` enum('ad','share','drawing','quest') not null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`point_grant_requests\` modify \`point_reason\` enum('ad','share','drawing') not null;`,
    );

    this.addSql(
      `alter table \`point_logs\` modify \`point_reason\` enum('ad','share','drawing') not null;`,
    );

    this.addSql(`alter table \`quests\` modify \`category\` varchar(20) null;`);
  }
}
