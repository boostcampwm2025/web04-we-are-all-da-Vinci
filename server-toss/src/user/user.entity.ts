import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/base.entity";

@Entity({ tableName: "users" })
export class User extends BaseEntity {
  @PrimaryKey()
  id!: bigint;

  @Property({ fieldName: "user_key" })
  userKey!: string;

  @Property()
  name!: string;
}
