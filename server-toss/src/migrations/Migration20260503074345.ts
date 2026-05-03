import { Migration } from "@mikro-orm/migrations";

export class Migration20260503074345 extends Migration {
  override up(): void {
    this.addSql(
      `alter table \`users\` modify \`user_key\` int unsigned not null;`,
    );

    this.addSql(`alter table \`drawings\` add \`user_key\` int unsigned null;`);
    this.addSql(
      `alter table \`point_logs\` add \`user_key\` int unsigned null;`,
    );
    this.addSql(`alter table \`ad_views\` add \`user_key\` int unsigned null;`);

    this.addSql(`
      update \`drawings\` d
      join \`users\` u on d.\`user_id\` = u.\`id\`
      set d.\`user_key\` = u.\`user_key\`;
    `);

    this.addSql(`
      update \`point_logs\` pl
      join \`users\` u on pl.\`user_id\` = u.\`id\`
      set pl.\`user_key\` = u.\`user_key\`;
    `);

    this.addSql(`
      update \`ad_views\` av
      join \`users\` u on av.\`user_id\` = u.\`id\`
      set av.\`user_key\` = u.\`user_key\`;
    `);

    this.addSql(
      `alter table \`drawings\` modify \`user_key\` int unsigned not null;`,
    );
    this.addSql(
      `alter table \`point_logs\` modify \`user_key\` int unsigned not null;`,
    );
    this.addSql(
      `alter table \`ad_views\` modify \`user_key\` int unsigned not null;`,
    );

    this.addSql(
      `alter table \`drawings\` drop foreign key \`drawings_user_id_foreign\`;`,
    );
    this.addSql(
      `alter table \`point_logs\` drop foreign key \`point_logs_user_id_foreign\`;`,
    );
    this.addSql(
      `alter table \`ad_views\` drop foreign key \`ad_views_user_id_foreign\`;`,
    );

    this.addSql(
      `alter table \`drawings\` drop index \`drawings_user_id_index\`;`,
    );
    this.addSql(
      `alter table \`point_logs\` drop index \`point_logs_user_id_index\`;`,
    );
    this.addSql(
      `alter table \`ad_views\` drop index \`ad_views_user_id_index\`;`,
    );

    this.addSql(`alter table \`drawings\` drop column \`user_id\`;`);
    this.addSql(`alter table \`point_logs\` drop column \`user_id\`;`);
    this.addSql(`alter table \`ad_views\` drop column \`user_id\`;`);

    this.addSql(
      `alter table \`drawings\` add index \`drawings_user_key_index\` (\`user_key\`);`,
    );
    this.addSql(
      `alter table \`point_logs\` add index \`point_logs_user_key_index\` (\`user_key\`);`,
    );
    this.addSql(
      `alter table \`ad_views\` add index \`ad_views_user_key_index\` (\`user_key\`);`,
    );

    this.addSql(
      `alter table \`drawings\` add constraint \`drawings_user_key_foreign\` foreign key (\`user_key\`) references \`users\` (\`user_key\`);`,
    );
    this.addSql(
      `alter table \`point_logs\` add constraint \`point_logs_user_key_foreign\` foreign key (\`user_key\`) references \`users\` (\`user_key\`);`,
    );
    this.addSql(
      `alter table \`ad_views\` add constraint \`ad_views_user_key_foreign\` foreign key (\`user_key\`) references \`users\` (\`user_key\`);`,
    );
  }

  override down(): void {
    this.addSql(
      `alter table \`ad_views\` drop foreign key \`ad_views_user_key_foreign\`;`,
    );
    this.addSql(
      `alter table \`point_logs\` drop foreign key \`point_logs_user_key_foreign\`;`,
    );
    this.addSql(
      `alter table \`drawings\` drop foreign key \`drawings_user_key_foreign\`;`,
    );

    this.addSql(
      `alter table \`ad_views\` drop index \`ad_views_user_key_index\`;`,
    );
    this.addSql(
      `alter table \`point_logs\` drop index \`point_logs_user_key_index\`;`,
    );
    this.addSql(
      `alter table \`drawings\` drop index \`drawings_user_key_index\`;`,
    );

    this.addSql(
      `alter table \`drawings\` add \`user_id\` bigint unsigned null;`,
    );
    this.addSql(
      `alter table \`point_logs\` add \`user_id\` bigint unsigned null;`,
    );
    this.addSql(
      `alter table \`ad_views\` add \`user_id\` bigint unsigned null;`,
    );

    this.addSql(`
      update \`drawings\` d
      join \`users\` u on d.\`user_key\` = u.\`user_key\`
      set d.\`user_id\` = u.\`id\`;
    `);

    this.addSql(`
      update \`point_logs\` pl
      join \`users\` u on pl.\`user_key\` = u.\`user_key\`
      set pl.\`user_id\` = u.\`id\`;
    `);

    this.addSql(`
      update \`ad_views\` av
      join \`users\` u on av.\`user_key\` = u.\`user_key\`
      set av.\`user_id\` = u.\`id\`;
    `);

    this.addSql(
      `alter table \`drawings\` modify \`user_id\` bigint unsigned not null;`,
    );
    this.addSql(
      `alter table \`point_logs\` modify \`user_id\` bigint unsigned not null;`,
    );
    this.addSql(
      `alter table \`ad_views\` modify \`user_id\` bigint unsigned not null;`,
    );

    this.addSql(`alter table \`drawings\` drop column \`user_key\`;`);
    this.addSql(`alter table \`point_logs\` drop column \`user_key\`;`);
    this.addSql(`alter table \`ad_views\` drop column \`user_key\`;`);

    this.addSql(
      `alter table \`drawings\` add index \`drawings_user_id_index\` (\`user_id\`);`,
    );
    this.addSql(
      `alter table \`point_logs\` add index \`point_logs_user_id_index\` (\`user_id\`);`,
    );
    this.addSql(
      `alter table \`ad_views\` add index \`ad_views_user_id_index\` (\`user_id\`);`,
    );

    this.addSql(
      `alter table \`drawings\` add constraint \`drawings_user_id_foreign\` foreign key (\`user_id\`) references \`users\` (\`id\`);`,
    );
    this.addSql(
      `alter table \`point_logs\` add constraint \`point_logs_user_id_foreign\` foreign key (\`user_id\`) references \`users\` (\`id\`);`,
    );
    this.addSql(
      `alter table \`ad_views\` add constraint \`ad_views_user_id_foreign\` foreign key (\`user_id\`) references \`users\` (\`id\`);`,
    );

    this.addSql(`alter table \`users\` modify \`user_key\` int  not null;`);
  }
}
