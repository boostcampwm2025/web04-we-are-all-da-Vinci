import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/base.entity";
import { UserRepository } from "./user.repository";
import { EntityRepositoryType } from "@mikro-orm/core";

@Entity({ tableName: "users", repository: () => UserRepository })
export class User extends BaseEntity {
  [EntityRepositoryType]?: UserRepository;

  @PrimaryKey()
  id!: bigint;

  @Property({ fieldName: "user_key" })
  userKey!: string;

  @Property({ length: 10 })
  name!: string;
}
