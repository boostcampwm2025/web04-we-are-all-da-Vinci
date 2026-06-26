import { Migration } from "@mikro-orm/migrations";

export class Migration20260626000000 extends Migration {
  // 미션 제목 리워딩 이력으로 시드가 title 기준 매칭을 하던 동안, 같은 미션 슬롯
  // (period+objective_type+category)에 옛 제목 행과 새 제목 행이 중복 생성됐다.
  // 이로 인해 오늘의 미션에 같은 미션이 2번 노출되고, 랜덤 풀 오염으로 일부 미션이
  // 누락됐다. 자연 키별로 canonical(MIN id) 하나만 남기고, 중복 행을 참조하는
  // user_missions를 canonical로 병합·재지정한 뒤 중복 mission 행을 삭제한다.
  // (시드 매칭이 자연 키로 바뀌어 재발하지 않으므로 1회성 정합화.)
  override up(): void {
    // 자연 키별 canonical(MIN id) 매핑. 임시 테이블은 트랜잭션 암묵 커밋을 일으키지 않는다.
    this.addSql(
      "create temporary table `_mission_dedup` as " +
        "select m.`id` as mission_id, (" +
        "  select min(m2.`id`) from `missions` m2 " +
        "  where m2.`period` = m.`period` " +
        "    and m2.`objective_type` = m.`objective_type` " +
        "    and coalesce(m2.`category`, '') = coalesce(m.`category`, '')" +
        ") as canonical_id " +
        "from `missions` m;",
    );

    // 같은 user+날짜에 canonical과 중복 행이 둘 다 할당된 경우, 진행도를 canonical로 병합.
    this.addSql(
      "update `user_missions` c " +
        "join `user_missions` dup on dup.`user_key` = c.`user_key` and dup.`created_at` = c.`created_at` " +
        "join `_mission_dedup` d on d.`mission_id` = dup.`mission_id` and d.`canonical_id` = c.`mission_id` and d.`mission_id` <> d.`canonical_id` " +
        "set c.`current_count` = greatest(c.`current_count`, dup.`current_count`), " +
        "    c.`completed_at` = coalesce(c.`completed_at`, dup.`completed_at`);",
    );

    // 병합 후 충돌하는 중복 user_missions 삭제(canonical이 이미 있는 경우).
    this.addSql(
      "delete um from `user_missions` um " +
        "join `_mission_dedup` d on d.`mission_id` = um.`mission_id` and d.`mission_id` <> d.`canonical_id` " +
        "where exists (" +
        "  select 1 from `user_missions` c " +
        "  where c.`user_key` = um.`user_key` and c.`created_at` = um.`created_at` and c.`mission_id` = d.`canonical_id`" +
        ");",
    );

    // 충돌하지 않는 나머지 중복 user_missions는 canonical로 재지정.
    this.addSql(
      "update `user_missions` um " +
        "join `_mission_dedup` d on d.`mission_id` = um.`mission_id` and d.`mission_id` <> d.`canonical_id` " +
        "set um.`mission_id` = d.`canonical_id`;",
    );

    // 참조가 없어진 중복 mission 행 삭제.
    this.addSql(
      "delete m from `missions` m " +
        "join `_mission_dedup` d on d.`mission_id` = m.`id` and d.`mission_id` <> d.`canonical_id`;",
    );

    this.addSql("drop temporary table `_mission_dedup`;");
  }

  override down(): void {
    // 데이터 정합화 마이그레이션 — 병합·삭제된 중복 행을 복원할 수 없어 되돌리지 않는다.
  }
}
