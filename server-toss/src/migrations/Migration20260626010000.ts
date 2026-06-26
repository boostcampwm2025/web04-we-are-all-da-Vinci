import { Migration } from "@mikro-orm/migrations";

export class Migration20260626010000 extends Migration {
  // 친구초대(invite) 미션 진행도 재정합화.
  // 그림 제출이 invite 미션을 잘못 증가시키던 버그(findActiveDrawingMissions가
  // INVITE를 포함 + SimpleActionCommand 무조건 매칭)로, 공유 0회인데 invite가
  // 부풀려졌다. 코드 수정과 함께 배포되며, 이미 부풀려진 미완료 invite 행을
  // 당일 share_logs 실개수로 되돌린다(Migration20260625000000의 재적용 — 버그가
  // 그 이후로도 계속 부풀렸기 때문).
  //
  // 주의: 거짓 '완료'(completed_at 존재)된 invite 행은 보상이 이미 지급됐을 수
  // 있어 여기서 건드리지 않는다(되돌리면 재완료 시 이중 보상 위험). 완료·보상
  // 회수는 별도 협의 후 처리한다.
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
    // 데이터 정합화 마이그레이션 — 부풀려졌던 원래 값을 복원할 수 없어 되돌리지 않는다.
  }
}
