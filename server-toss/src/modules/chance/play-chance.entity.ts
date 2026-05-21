import type { Opt } from "@mikro-orm/core";
import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";

// 카운터 테이블이라 User aggregate와 의도적으로 디커플링했어요 (FK 없음).
// 사용자 삭제 시 잔여 행이 남아도 chance.service.findOrCreate가 row가 없으면
// 새로 생성하므로 무결성에는 영향이 없어요.
@Entity({ tableName: "play_chances" })
export class PlayChance {
  @PrimaryKey({
    fieldName: "user_key",
    type: "integer",
    unsigned: true,
    autoincrement: false,
  })
  userKey!: number;

  // 광고/공유로 충전한 추가 기회. 일일 리셋 없이 다음 날로 이월된다.
  @Property({ type: "int", default: 0 })
  count: Opt<number> = 0; // default 책임이 엔티티에 있음

  // 무료 플레이를 마지막으로 사용한 날(KST 자정 기준). 오늘보다 과거면 오늘 무료 1회 가능.
  @Property({ fieldName: "last_reset_at", type: "datetime" })
  lastResetAt!: Date;
}
