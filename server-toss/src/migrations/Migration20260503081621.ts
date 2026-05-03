import { Migration } from "@mikro-orm/migrations";

export class Migration20260503081621 extends Migration {
  override isTransactional(): boolean {
    return false;
  }

  override up(): void {
    // 1. id는 auto_increment이므로 PK를 제거하기 전에 auto_increment를 먼저 제거
    this.addSql(
      `alter table \`users\` modify \`id\` bigint unsigned not null;`,
    );

    // 2. 기존 PK(id) 제거
    this.addSql(`alter table \`users\` drop primary key;`);

    // 3. user_key를 PK로 승격
    this.addSql(`alter table \`users\` add primary key (\`user_key\`);`);

    // 4. user_key가 PK가 되었으므로 기존 unique index 제거
    this.addSql(`alter table \`users\` drop index \`users_user_key_unique\`;`);

    // 5. id 제거
    this.addSql(`alter table \`users\` drop column \`id\`;`);
  }

  override down(): void {
    // 1. id를 다시 추가
    // auto_increment 컬럼은 반드시 key여야 하므로 unique key로 먼저 추가
    this.addSql(
      `alter table \`users\` add \`id\` bigint unsigned not null auto_increment unique first;`,
    );

    // 2. user_key PK를 내리기 전에 unique index를 먼저 복구
    // child table들이 아직 users.user_key를 FK로 참조 중이므로
    // user_key는 계속 unique 또는 primary key여야 함
    this.addSql(
      `alter table \`users\` add unique \`users_user_key_unique\` (\`user_key\`);`,
    );

    // 3. user_key PK 제거
    this.addSql(`alter table \`users\` drop primary key;`);

    // 4. id를 다시 PK로 승격
    this.addSql(`alter table \`users\` add primary key (\`id\`);`);
  }
}
