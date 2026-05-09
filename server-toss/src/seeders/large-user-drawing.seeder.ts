import { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { loadPromptOne, loadStrokesOne } from "./helpers/prompt-seed.helper";
import { Prompt } from "src/modules/prompt/prompt.entity";
import { User } from "src/modules/user/user.entity";
import { UserFactory } from "./factories/user.factory";
import { SEED_USER_KEY_BASE } from "./helpers/seed.constants";
import { DrawingFactory } from "./factories/drawing.factory";

const DEFAULT_TOTAL_USERS = 1000;
const DEFAULT_BATCH_SIZE = 200;

export class LargeUserDrawingSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const totalUsers = DEFAULT_TOTAL_USERS;
    const batchSize = DEFAULT_BATCH_SIZE;

    const prompt = await loadPromptOne(em);
    const strokes = await loadStrokesOne();
    em.persist(prompt);
    await em.flush();
    em.clear();

    for (let start = 0; start < totalUsers; start += batchSize) {
      const end = Math.min(start + batchSize, totalUsers);

      await em.transactional(async (txEm) => {
        const promptRef = txEm.getReference(Prompt, prompt.id);

        for (let i = start; i < end; ++i) {
          const user: User = new UserFactory(txEm).makeOne({
            userKey: SEED_USER_KEY_BASE + i,
            name: `seed${String(i).padStart(5, "0")}`,
          });

          new DrawingFactory(txEm)
            .each((drawingEntity) => {
              drawingEntity.user = user;
            })
            .make(2, { prompt: promptRef, strokes });
        }

        await txEm.flush();
        txEm.clear();
      });
    }
  }
}
