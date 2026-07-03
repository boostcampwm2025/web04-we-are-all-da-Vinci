import { Migration } from '@mikro-orm/migrations';

export class Migration20260703033909 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table \`prompts\` modify \`strokes\` mediumtext not null;`);

    this.addSql(`alter table \`rankings\` modify \`strokes\` mediumtext not null;`);

    this.addSql(`alter table \`drawings\` modify \`strokes\` mediumtext not null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table \`prompts\` modify \`strokes\` varchar(255) not null;`);

    this.addSql(`alter table \`rankings\` modify \`strokes\` varchar(255) not null;`);

    this.addSql(`alter table \`drawings\` modify \`strokes\` varchar(255) not null;`);
  }

}
