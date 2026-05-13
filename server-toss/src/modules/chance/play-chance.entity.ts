import type { Opt } from "@mikro-orm/core";
import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";

// 카운터 테이블이라 User aggregate와 의도적으로 디커플링했어요 (FK 없음).
// 사용자 삭제 시 잔여 행은 일일 reset 로직으로 자연스럽게 정리되며,
// chance.service.getOrInitWithReset가 row가 없으면 새로 생성해 무결성을 보장해요.
@Entity({ tableName: "play_chances" })
export class PlayChance {
  @PrimaryKey({
    fieldName: "user_key",
    type: "integer",
    unsigned: true,
    autoincrement: false,
  })
  userKey!: number;

  @Property({ type: "int", default: 0 })
  // 나중에 기본 횟수가 바뀌어도 서비스 코드는 건드릴 필요가 없음
  count: Opt<number> = 0; // default 책임이 엔티티 있음

  @Property({ fieldName: "last_reset_at", type: "datetime" })
  lastResetAt!: Date;
}
