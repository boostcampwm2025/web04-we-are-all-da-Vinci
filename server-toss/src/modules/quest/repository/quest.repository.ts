import { EntityRepository } from "@mikro-orm/mysql";
import { Quest, QuestPeriod } from "../entity/quest.entity";

export class QuestRepository extends EntityRepository<Quest> {
  async findFixed(period: QuestPeriod): Promise<Quest[]> {
    return this.find({ period, isFixed: true });
  }

  async findRandom(period: QuestPeriod): Promise<Quest[]> {
    return this.find({ period, isFixed: false });
  }

  async findTutorial(): Promise<Quest[]> {
    return this.find({ period: QuestPeriod.TUTORIAL });
  }
}
