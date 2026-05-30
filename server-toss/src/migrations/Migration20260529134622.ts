import { Migration } from "@mikro-orm/migrations";

export class Migration20260529134622 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table \`quests\` (\`id\` bigint unsigned not null auto_increment primary key, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`title\` varchar(255) not null, \`period\` enum('daily','weekly') not null, \`is_fixed\` tinyint(1) not null, \`objective_type\` enum('submit','score','penalty','daily_submit','daily_score','quest_completed') not null, \`required_count\` int not null, \`threshold\` int null, \`reward_type\` enum('point','chance') not null, \`reward_amount\` int not null) default character set utf8mb4 engine = InnoDB;`,
    );

    this.addSql(
      `create table \`user_quests\` (\`id\` bigint unsigned not null auto_increment primary key, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`user_key\` int unsigned not null, \`quest_id\` bigint unsigned not null, \`current_count\` int not null default 0, \`completed_at\` datetime null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`user_quests\` add index \`user_quests_user_key_index\` (\`user_key\`);`,
    );
    this.addSql(
      `alter table \`user_quests\` add index \`user_quests_quest_id_index\` (\`quest_id\`);`,
    );
    this.addSql(
      `alter table \`user_quests\` add unique index \`user_quests_user_key_quest_id_created_at_unique\` (\`user_key\`, \`quest_id\`, \`created_at\`);`,
    );

    this.addSql(
      `alter table \`user_quests\` add constraint \`user_quests_user_key_foreign\` foreign key (\`user_key\`) references \`users\` (\`user_key\`);`,
    );
    this.addSql(
      `alter table \`user_quests\` add constraint \`user_quests_quest_id_foreign\` foreign key (\`quest_id\`) references \`quests\` (\`id\`);`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table \`user_quests\` drop foreign key \`user_quests_quest_id_foreign\`;`,
    );

    this.addSql(`drop table if exists \`quests\`;`);
    this.addSql(`drop table if exists \`user_quests\`;`);
  }
}
