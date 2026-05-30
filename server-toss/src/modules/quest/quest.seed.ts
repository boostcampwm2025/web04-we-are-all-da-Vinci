import { EntityManager } from "@mikro-orm/core";
import { Injectable, Logger } from "@nestjs/common";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import {
  ObjectiveType,
  Quest,
  QuestPeriod,
  RewardType,
} from "./entity/quest.entity";
import { UserQuest } from "./entity/user-quest.entity";

const QuestDefinitionSchema = z.object({
  title: z.string().min(1).max(50),
  period: z.enum(QuestPeriod),
  isFixed: z.boolean(),
  objectiveType: z.enum(ObjectiveType),
  requiredCount: z.number().int().positive(),
  threshold: z.number().int().nullable().default(null),
  rewardType: z.enum(RewardType),
  rewardAmount: z.number().int().positive(),
});

const QuestsFileSchema = z
  .array(QuestDefinitionSchema)
  .refine(
    (quests) => new Set(quests.map((q) => q.title)).size === quests.length,
    { message: "퀘스트 제목이 중복됩니다" },
  );

export type QuestDefinition = z.infer<typeof QuestDefinitionSchema>;

export interface QuestSeedResult {
  added: number;
  updated: number;
  deleted: number;
  protected: number;
}

@Injectable()
export class QuestSeedService {
  private readonly logger = new Logger(QuestSeedService.name);

  constructor(private readonly em: EntityManager) {}

  async run(): Promise<QuestSeedResult> {
    const data = await this.loadQuests();
    const result = await this.syncQuests(data);
    this.logger.log(
      { event: "quest.seed.completed", ...result },
      "퀘스트 시드 완료",
    );
    return result;
  }

  async syncQuests(data: QuestDefinition[]): Promise<QuestSeedResult> {
    const em = this.em.fork();
    let added = 0;
    let updated = 0;
    let deleted = 0;
    let protectedCount = 0;

    await em.transactional(async (txEm) => {
      const questRepo = txEm.getRepository(Quest);
      const userQuestRepo = txEm.getRepository(UserQuest);

      const allQuests = await questRepo.findAll();
      const jsonTitles = new Set(data.map((d) => d.title));

      for (const quest of allQuests) {
        if (jsonTitles.has(quest.title)) continue;

        const userQuestCount = await userQuestRepo.count({ quest });

        if (userQuestCount > 0) {
          protectedCount++;
          this.logger.log(
            {
              event: "quest.seed.protected",
              questId: String(quest.id),
              title: quest.title,
            },
            `퀘스트 보존 (user_quest 있음): ${quest.title}`,
          );
        } else {
          txEm.remove(quest);
          deleted++;
          this.logger.log(
            {
              event: "quest.seed.deleted",
              questId: String(quest.id),
              title: quest.title,
            },
            `퀘스트 삭제: ${quest.title}`,
          );
        }
      }

      await txEm.flush();

      const existingByTitle = new Map(
        allQuests
          .filter((q) => jsonTitles.has(q.title))
          .map((q) => [q.title, q]),
      );

      for (const def of data) {
        const existing = existingByTitle.get(def.title);

        if (existing) {
          if (this.applyChanges(existing, def)) {
            updated++;
            this.logger.log(
              {
                event: "quest.seed.updated",
                questId: String(existing.id),
                title: def.title,
              },
              `퀘스트 업데이트: ${def.title}`,
            );
          }
        } else {
          const quest = new Quest();
          quest.title = def.title;
          quest.period = def.period;
          quest.isFixed = def.isFixed;
          quest.objectiveType = def.objectiveType;
          quest.requiredCount = def.requiredCount;
          quest.threshold = def.threshold ?? undefined;
          quest.rewardType = def.rewardType;
          quest.rewardAmount = def.rewardAmount;
          txEm.persist(quest);
          added++;
          this.logger.log(
            { event: "quest.seed.added", title: def.title },
            `퀘스트 추가: ${def.title}`,
          );
        }
      }

      await txEm.flush();
    });

    return { added, updated, deleted, protected: protectedCount };
  }

  private applyChanges(quest: Quest, def: QuestDefinition): boolean {
    let changed = false;
    if (quest.period !== def.period) {
      quest.period = def.period;
      changed = true;
    }
    if (quest.isFixed !== def.isFixed) {
      quest.isFixed = def.isFixed;
      changed = true;
    }
    if (quest.objectiveType !== def.objectiveType) {
      quest.objectiveType = def.objectiveType;
      changed = true;
    }
    if (quest.requiredCount !== def.requiredCount) {
      quest.requiredCount = def.requiredCount;
      changed = true;
    }
    if (quest.threshold !== (def.threshold ?? undefined)) {
      quest.threshold = def.threshold ?? undefined;
      changed = true;
    }
    if (quest.rewardType !== def.rewardType) {
      quest.rewardType = def.rewardType;
      changed = true;
    }
    if (quest.rewardAmount !== def.rewardAmount) {
      quest.rewardAmount = def.rewardAmount;
      changed = true;
    }
    return changed;
  }

  private async loadQuests(): Promise<QuestDefinition[]> {
    const questPath = path.join(process.cwd(), "data", "quests.json");
    const raw = await readFile(questPath, "utf-8");
    return QuestsFileSchema.parse(JSON.parse(raw));
  }
}
