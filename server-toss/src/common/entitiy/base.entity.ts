import type { Opt } from "@mikro-orm/core";
import { Entity, Property } from "@mikro-orm/decorators/legacy";

@Entity({ abstract: true })
export abstract class BaseEntity {
  @Property({
    fieldName: "created_at",
    type: "timestamp",
    onCreate: () => new Date(),
  })
  createdAt: Opt<Date> = new Date();

  @Property({
    fieldName: "updated_at",
    type: "timestamp",
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  updatedAt: Opt<Date> = new Date();
}
