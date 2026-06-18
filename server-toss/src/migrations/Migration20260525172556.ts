import { Migration } from "@mikro-orm/migrations";

export class Migration20260525172556 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table \`point_grant_requests\` (\`id\` bigint unsigned not null auto_increment primary key, \`created_at\` datetime not null, \`updated_at\` datetime not null, \`user_key\` int unsigned not null, \`point_grant_status\` enum('pending','processing','retry','failed','succeeded') not null, \`point_amount\` int not null, \`point_reason\` enum('ad','share','drawing') not null, \`attempt_count\` int not null, \`max_attempt_count\` int not null, \`next_retry_at\` datetime null, \`locked_at\` datetime null, \`processed_at\` datetime null, \`failed_message\` text null, \`point_idempotency_key\` varchar(255) null) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`point_grant_requests\` add index \`point_grant_requests_user_key_index\` (\`user_key\`);`,
    );
    this.addSql(
      `alter table \`point_grant_requests\` add index \`idx_pgr_status_locked_at\` (\`point_grant_status\` ASC, \`locked_at\` ASC);`,
    );
    this.addSql(
      `alter table \`point_grant_requests\` add index \`idx_pgr_status_next_retry_at\` (\`point_grant_status\` ASC, \`next_retry_at\` ASC);`,
    );
    this.addSql(
      `alter table \`point_grant_requests\` add index \`idx_pgr_status_created_at\` (\`point_grant_status\` ASC, \`created_at\` ASC);`,
    );

    this.addSql(
      `alter table \`point_grant_requests\` add constraint \`point_grant_requests_user_key_foreign\` foreign key (\`user_key\`) references \`users\` (\`user_key\`);`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`point_grant_requests\`;`);
  }
}
