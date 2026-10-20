import { Migration } from "@mikro-orm/migrations";

export class Migration20261013000000 extends Migration {
  override up(): void {
    this.addSql(
      "alter table `point_logs` add `point_grant_request_id` bigint unsigned null;",
    );
    this.addSql(
      "alter table `point_logs` add unique `point_logs_point_grant_request_id_unique` (`point_grant_request_id`);",
    );
  }

  override down(): void {
    this.addSql(
      "alter table `point_logs` drop index `point_logs_point_grant_request_id_unique`;",
    );
    this.addSql(
      "alter table `point_logs` drop column `point_grant_request_id`;",
    );
  }
}
