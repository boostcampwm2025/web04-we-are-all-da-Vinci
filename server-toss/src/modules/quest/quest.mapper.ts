import type { MyQuest } from "./dto/my-quests-response.dto";
import { MyQuestsResponseDto } from "./dto/my-quests-response.dto";
import type { TutorialCategoryDto } from "./dto/tutorial-category.dto";
import { ObjectiveType, QuestPeriod } from "./entity/quest.entity";
import type { UserQuest } from "./entity/user-quest.entity";

const TUTORIAL_CATEGORY_LABELS: Record<string, string> = {
  drawing: "그리기",
  explore: "둘러보기",
  share: "공유",
};

export class QuestMapper {
  static toResponse(
    quests: UserQuest[],
    tutorialQuests: UserQuest[] = [],
  ): MyQuestsResponseDto {
    const dailyQuests = quests
      .filter((uq) => uq.quest.period === QuestPeriod.DAILY)
      .map(QuestMapper.toMyQuest);

    const weeklyQuests = quests
      .filter((uq) => uq.quest.period === QuestPeriod.WEEKLY)
      .map(QuestMapper.toMyQuest);

    const tutorialCategories =
      QuestMapper.buildTutorialCategories(tutorialQuests);

    return { dailyQuests, weeklyQuests, tutorialCategories };
  }

  private static readonly toMyQuest = (uq: UserQuest): MyQuest => ({
    userQuestId: Number(uq.id),
    questId: Number(uq.quest.id),
    title: uq.quest.title,
    currentCount: uq.currentCount,
    requiredCount: uq.quest.requiredCount,
    rewardType: uq.quest.rewardType,
    rewardAmount: uq.quest.rewardAmount,
  });

  private static buildTutorialCategories(
    tutorialQuests: UserQuest[],
  ): TutorialCategoryDto[] {
    if (tutorialQuests.length === 0) return [];

    const metaByCategory = new Map<string, UserQuest>();
    const questsByCategory = new Map<string, UserQuest[]>();

    for (const uq of tutorialQuests) {
      const category = uq.quest.category;
      if (!category) continue;

      if (uq.quest.objectiveType === ObjectiveType.TUTORIAL_COMPLETED) {
        metaByCategory.set(category, uq);
      } else {
        const list = questsByCategory.get(category) ?? [];
        list.push(uq);
        questsByCategory.set(category, list);
      }
    }

    const categories: TutorialCategoryDto[] = [];
    for (const [category, quests] of questsByCategory) {
      const meta = metaByCategory.get(category);
      categories.push({
        category,
        label: TUTORIAL_CATEGORY_LABELS[category] ?? category,
        rewardAmount: meta?.quest.rewardAmount ?? 0,
        isCompleted: meta?.completedAt != null,
        quests: quests.map(QuestMapper.toMyQuest),
      });
    }

    return categories;
  }
}
