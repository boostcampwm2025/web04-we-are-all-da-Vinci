import { Migration } from "@mikro-orm/migrations";

export class Migration20261020010000 extends Migration {
  override up(): void {
    this.addSql(
      "alter table `point_grant_requests` modify `point_grant_status` enum('pending','processing','retry','failed','succeeded','suspended') not null;",
    );
  }

  override async down(): Promise<void> {
    const suspended = await this.execute(
      "select id from `point_grant_requests` where `point_grant_status` = 'suspended' limit 1;",
    );
    if (suspended.length > 0) {
      throw new Error(
        "SUSPENDED 요청을 명시적으로 복구한 후 마이그레이션을 되돌려 주세요.",
      );
    }
    this.addSql(
      "alter table `point_grant_requests` modify `point_grant_status` enum('pending','processing','retry','failed','succeeded') not null;",
    );
  }
}
