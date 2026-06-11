import type { Opt } from "@mikro-orm/core";
import { EntityRepositoryType, PrimaryKeyProp } from "@mikro-orm/core";
import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/entitiy/base.entity";
import { UserRepository } from "./user.repository";

@Entity({ tableName: "users", repository: () => UserRepository })
export class User extends BaseEntity {
  [EntityRepositoryType]?: UserRepository;
  // PK 이름이 id/_id/uuid가 아니므로 Primary<User> 추론을 위해 명시한다.
  [PrimaryKeyProp]?: "userKey";

  @PrimaryKey({
    fieldName: "user_key",
    type: "integer",
    unsigned: true,
    autoincrement: false,
  })
  userKey!: number;

  @Property({ length: 10, type: "string" })
  name!: string;

  @Property({ length: 20, type: "string", unique: true })
  nickname!: string;

  @Property({ length: 8, type: "string", nullable: true })
  gender?: Opt<string>;

  @Property({ type: "date", nullable: true })
  birthday?: Opt<Date>;

  /**
   * 튜토리얼 완료 "시점" checkpoint (boolean 아님).
   * 튜토리얼 콘텐츠 버전(max Quest.createdAt, period=tutorial)과 비교해
   * checkpoint ≥ 버전이면 완료 — 새 튜토리얼이 배포되면 게이트가 자동으로 다시 열린다.
   */
  @Property({
    fieldName: "tutorial_completed_at",
    type: "datetime",
    nullable: true,
  })
  tutorialCompletedAt?: Opt<Date | null>;
}
