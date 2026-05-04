import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/base.entity";
import { UserRepository } from "./user.repository";
import { EntityRepositoryType, PrimaryKeyProp } from "@mikro-orm/core";
import type { Opt } from "@mikro-orm/core";

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

  @Property({ length: 8, type: "string", nullable: true })
  gender?: Opt<string>;

  @Property({ type: "date", nullable: true })
  birthday?: Opt<Date>;
}
