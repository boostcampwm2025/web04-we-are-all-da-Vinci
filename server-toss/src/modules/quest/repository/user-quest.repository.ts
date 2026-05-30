import { EntityRepository } from "@mikro-orm/mysql";
import { User } from "src/modules/user/user.entity";
import { ObjectiveType, QuestPeriod } from "../entity/quest.entity";
import type { Quest } from "../entity/quest.entity";
import { UserQuest } from "../entity/user-quest.entity";

export class UserQuestRepository extends EntityRepository<UserQuest> {
  async findCurrentQuests(
    userKey: number,
    todayStart: Date,
    weekStart: Date,
  ): Promise<UserQuest[]> {
    return this.find(
      {
        user: { userKey },
        $or: [
          { quest: { period: QuestPeriod.DAILY }, createdAt: todayStart },
          { quest: { period: QuestPeriod.WEEKLY }, createdAt: weekStart },
        ],
      },
      { populate: ["quest"] },
    );
  }

  async findActiveByObjective(
    userKey: number,
    objectiveType: ObjectiveType,
    todayStart: Date,
    weekStart: Date,
  ): Promise<UserQuest[]> {
    return this.find(
      {
        user: { userKey },
        completedAt: null,
        quest: { objectiveType },
        $or: [
          { quest: { period: QuestPeriod.DAILY }, createdAt: todayStart },
          { quest: { period: QuestPeriod.WEEKLY }, createdAt: weekStart },
        ],
      },
      { populate: ["quest"] },
    );
  }

  createForUser(userKey: number, quest: Quest, periodStart: Date): UserQuest {
    const userRef = this.getEntityManager().getReference(User, userKey);
    const uq = this.create({ user: userRef, quest, createdAt: periodStart });
    this.em.persist(uq);
    return uq;
  }

  async findActiveDrawingQuests(
    userKey: number,
    todayStart: Date,
    weekStart: Date,
  ): Promise<UserQuest[]> {
    return this.find(
      {
        user: { userKey },
        completedAt: null,
        quest: { objectiveType: { $ne: ObjectiveType.QUEST_COMPLETED } },
        $or: [
          { quest: { period: QuestPeriod.DAILY }, createdAt: todayStart },
          { quest: { period: QuestPeriod.WEEKLY }, createdAt: weekStart },
        ],
      },
      { populate: ["quest"] },
    );
  }

  async flush(): Promise<void> {
    await this.getEntityManager().flush();
  }
}
