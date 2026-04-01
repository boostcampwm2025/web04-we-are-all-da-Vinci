import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/base.entity";
import { UserRepository } from "./user.repository";
import { EntityRepositoryType } from "@mikro-orm/core";

@Entity({ tableName: "users", repository: () => UserRepository })
export class User extends BaseEntity {
  [EntityRepositoryType]?: UserRepository;

  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @Property({ fieldName: "user_key", type: "int" })
  userKey!: number;

  @Property({ length: 10, type: "string" })
  name!: string;

  @Property({ length: 8, type: "string", nullable: true })
  gender?: string;

  @Property({ type: "datetime", nullable: true })
  birthday?: Date;
}
