import { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { UserFactory } from "./factories/user.factory";
import { DrawingFactory } from "./factories/drawing.factory";
import { Drawing } from "src/modules/drawing/drawing.entity";
import { loadPromptOne, loadStrokesOne } from "./helpers/prompt-seed.helper";
import { User } from "src/modules/user/user.entity";
import { SEED_USER_KEY_BASE } from "./helpers/seed.constants";

export class LightSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const prompt = await loadPromptOne(em);
    const strokes = await loadStrokesOne();

    const drawings: Drawing[] = [];

    for (let i = 0; i < 120; ++i) {
      const user: User = new UserFactory(em).makeOne({
        userKey: SEED_USER_KEY_BASE + i,
        name: `seed${String(i).padStart(3, "0")}`,
      });

      drawings.push(
        ...new DrawingFactory(em)
          .each((drawingEntity) => {
            drawingEntity.user = user;
          })
          .make(2, { prompt, strokes }),
      );
    }
    await em.flush();
  }
}
