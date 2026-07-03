import { Migration } from "@mikro-orm/migrations";

export class Migration20260625000000 extends Migration {
  // 친구초대 미션 진행도(current_count) 백필.
  // 과거 분리-트랜잭션 드리프트로 share_logs와 어긋난 미완료 행을, 해당 일자
  // share_logs 실개수(상한 required_count)로 1회 정합화한다. 배포 시 migration:up이
  // 실행하므로 다음날 자연 정상화를 기다리지 않고 즉시 보정된다. 멱등(같은 값 재설정).
  override up(): void {
    this.addSql(
      "update `user_missions` um " +
        "join `missions` m on m.`id` = um.`mission_id` " +
        "set um.`current_count` = least(m.`required_count`, (" +
        "select count(*) from `share_logs` sl " +
        "where sl.`user_key` = um.`user_key` " +
        "and sl.`created_at` >= um.`created_at` " +
        "and sl.`created_at` < um.`created_at` + interval 1 day" +
        ")) " +
        "where m.`objective_type` = 'invite' and um.`completed_at` is null;",
    );
  }

  override down(): void {
    // 데이터 보정 마이그레이션 — 어긋났던 원래 값을 복원할 수 없어 되돌리지 않는다.
  }
}
