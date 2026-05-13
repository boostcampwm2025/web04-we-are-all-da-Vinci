import { Migration } from "@mikro-orm/migrations";

export class Migration20260514000000 extends Migration {
  override async up(): Promise<void> {
    // DATE 컬럼은 KST 자정의 UTC 시각(=전날 UTC 15:00)을 저장할 때 UTC 기준 날짜만
    // 잘려 하루 일찍 박힘. DATETIME으로 바꿔 시각을 보존하면 KST 정규화 비교가
    // 안정적으로 동작.
    await this.execute(
      "alter table `play_chances` modify column `last_reset_at` datetime not null;",
    );
  }

  override async down(): Promise<void> {
    await this.execute(
      "alter table `play_chances` modify column `last_reset_at` date not null;",
    );
  }
}
