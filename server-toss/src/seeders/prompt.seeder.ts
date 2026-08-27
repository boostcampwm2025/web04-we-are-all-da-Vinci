import { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { PromptSeedService } from "src/modules/prompt/prompt.seed";

export class PromptSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const seeder = new PromptSeedService(em);

    await seeder.run();
  }
}
