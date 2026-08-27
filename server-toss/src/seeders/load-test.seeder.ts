import { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { PromptSeeder } from "./prompt.seeder";
import { LargeUserDrawingSeeder } from "./large-user-drawing.seeder";
import { RankingSeeder } from "./ranking.seeder";

export class LoadTestSeeder extends Seeder {
  run(em: EntityManager): void | Promise<void> {
    return this.call(em, [PromptSeeder, LargeUserDrawingSeeder, RankingSeeder]);
  }
}
