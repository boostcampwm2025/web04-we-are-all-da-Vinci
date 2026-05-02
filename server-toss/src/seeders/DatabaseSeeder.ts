import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";

export class DatabaseSeeder extends Seeder {
  // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
  async run(em: EntityManager): Promise<void> {
    return;
  }
}
