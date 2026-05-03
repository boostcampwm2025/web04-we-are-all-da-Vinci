import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/base.entity";
import { UserRepository } from "./user.repository";
import { EntityRepositoryType } from "@mikro-orm/core";
import type { Opt } from "@mikro-orm/core";

@Entity({ tableName: "users", repository: () => UserRepository })
export class User extends BaseEntity {
  [EntityRepositoryType]?: UserRepository;

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
