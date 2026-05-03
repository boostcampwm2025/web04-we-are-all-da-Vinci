import { EntityData } from "@mikro-orm/core";
import { Factory } from "@mikro-orm/seeder";
import { User } from "src/modules/user/user.entity";

export class UserFactory extends Factory<User> {
  model = User;
  definition(input?: EntityData<User>): EntityData<User> {
    return {
      ...input,
    };
  }
}
