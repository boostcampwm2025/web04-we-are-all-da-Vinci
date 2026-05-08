import type { Opt, Rel } from "@mikro-orm/core";
import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";
import { BaseEntity } from "src/common/entitiy/base.entity";
import { User } from "src/modules/user/user.entity";

export enum ShareChannel {
  CONTACTS_VIRAL = "contactsViral",
}

@Entity({ tableName: "share_logs" })
@Index({ properties: ["user", "createdAt"] })
export class ShareLog extends BaseEntity {
  @PrimaryKey({ type: "bigint" })
  id!: bigint;

  @ManyToOne(() => User, { joinColumn: "user_key" })
  user!: Rel<User>;

  @Enum({ items: () => ShareChannel, fieldName: "channel" })
  channel!: ShareChannel;

  @Property({
    fieldName: "module_id",
    type: "string",
    length: 64,
    nullable: true,
  })
  moduleId?: Opt<string>;
}
