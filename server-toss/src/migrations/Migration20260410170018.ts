import { Migration } from '@mikro-orm/migrations';

export class Migration20260410170018 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table \`prompts\` (\`id\` bigint unsigned not null auto_increment primary key, \`strokes\` text not null) default character set utf8mb4 engine = InnoDB;`);

    this.addSql(`create table \`daily_prompts\` (\`id\` bigint unsigned not null auto_increment primary key, \`prompt_id\` bigint unsigned not null, \`prompt_date\` date not null) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`daily_prompts\` add index \`daily_prompts_prompt_id_index\` (\`prompt_id\`);`);
    this.addSql(`alter table \`daily_prompts\` add unique \`daily_prompts_prompt_date_unique\` (\`prompt_date\`);`);

    this.addSql(`create table \`rankings\` (\`id\` bigint unsigned not null auto_increment primary key, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`name\` varchar(10) not null, \`strokes\` text not null, \`similarity\` text not null, \`user_id\` bigint not null, \`drawing_id\` bigint not null) default character set utf8mb4 engine = InnoDB;`);

    this.addSql(`create table \`users\` (\`id\` bigint unsigned not null auto_increment primary key, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`user_key\` int not null, \`name\` varchar(10) not null, \`gender\` varchar(8) null, \`birthday\` date null) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`users\` add unique \`users_user_key_unique\` (\`user_key\`);`);

    this.addSql(`create table \`point_logs\` (\`id\` bigint unsigned not null auto_increment primary key, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`point_reason\` enum('ad','share','drawing') not null, \`point_amount\` int not null, \`user_id\` bigint unsigned not null) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`point_logs\` add index \`point_logs_user_id_index\` (\`user_id\`);`);

    this.addSql(`create table \`drawings\` (\`id\` bigint unsigned not null auto_increment primary key, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`strokes\` text not null, \`similarity\` text not null, \`user_id\` bigint unsigned not null, \`prompt_id\` bigint unsigned not null) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`drawings\` add index \`drawings_user_id_index\` (\`user_id\`);`);
    this.addSql(`alter table \`drawings\` add index \`drawings_prompt_id_index\` (\`prompt_id\`);`);

    this.addSql(`create table \`ad_views\` (\`id\` bigint unsigned not null auto_increment primary key, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`ad_type\` enum('drawing') not null, \`user_id\` bigint unsigned not null) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`ad_views\` add index \`ad_views_user_id_index\` (\`user_id\`);`);

    this.addSql(`alter table \`daily_prompts\` add constraint \`daily_prompts_prompt_id_foreign\` foreign key (\`prompt_id\`) references \`prompts\` (\`id\`);`);

    this.addSql(`alter table \`point_logs\` add constraint \`point_logs_user_id_foreign\` foreign key (\`user_id\`) references \`users\` (\`id\`);`);

    this.addSql(`alter table \`drawings\` add constraint \`drawings_user_id_foreign\` foreign key (\`user_id\`) references \`users\` (\`id\`);`);
    this.addSql(`alter table \`drawings\` add constraint \`drawings_prompt_id_foreign\` foreign key (\`prompt_id\`) references \`prompts\` (\`id\`);`);

    this.addSql(`alter table \`ad_views\` add constraint \`ad_views_user_id_foreign\` foreign key (\`user_id\`) references \`users\` (\`id\`);`);
  }

}
