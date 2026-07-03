import { Migration } from "@mikro-orm/migrations";

export class Migration20260624000000 extends Migration {
  override up(): void {
    this.addSql(
      "alter table `missions` modify `objective_type` enum('submit','score','penalty','daily_submit','daily_score','mission_completed','visit_ranking','visit_podium','visit_mission_tab','visit_drawing_detail','share','invite','retry','tutorial_completed') not null;",
    );
  }

  override down(): void {
    // ENUM 축소 전 신규 값 레코드 정리 — 남아 있으면 MODIFY 시 DB 에러로 롤백이 중단됨.
    this.addSql(
      "delete from `user_missions` where `mission_id` in (select `id` from `missions` where `objective_type` = 'invite');",
    );
    this.addSql("delete from `missions` where `objective_type` = 'invite';");
    this.addSql(
      "alter table `missions` modify `objective_type` enum('submit','score','penalty','daily_submit','daily_score','mission_completed','visit_ranking','visit_podium','visit_mission_tab','visit_drawing_detail','share','retry','tutorial_completed') not null;",
    );
  }
}
