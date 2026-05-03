import { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { Drawing } from "src/modules/drawing/drawing.entity";
import { createRanking } from "./helpers/create-ranking.helper";
import { RankingFactory } from "./factories/ranking.factory";

export class RankingSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const drawings: Drawing[] = await em
      .fork()
      .findAll(Drawing, { populate: ["user.id", "user.name", "user.userKey"] });

    if (drawings.length < 1) {
      throw new Error("유저, 그림 데이터가 필요합니다.");
    }

    createRanking(drawings).map((data) => new RankingFactory(em).makeOne(data));

    await em.flush();
  }
}
