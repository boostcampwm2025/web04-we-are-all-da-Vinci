import { Migration } from "@mikro-orm/migrations";

export class Migration20260528120000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      "alter table `sent_notifications` add column `status` varchar(16) not null default 'IN_FLIGHT';",
    );
    this.addSql("update `sent_notifications` set `status` = 'DELIVERED';");
    this.addSql(
      "alter table `sent_notifications` add index `idx_sent_notifications_type_status_sent_at` (`type`, `status`, `sent_at`);",
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      "alter table `sent_notifications` drop index `idx_sent_notifications_type_status_sent_at`;",
    );
    this.addSql("alter table `sent_notifications` drop column `status`;");
  }
}
