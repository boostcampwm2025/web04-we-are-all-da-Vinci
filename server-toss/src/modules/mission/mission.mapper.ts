import type { MyMission } from "./dto/my-missions-response.dto";
import { MyMissionsResponseDto } from "./dto/my-missions-response.dto";
import type { TutorialCategoryDto } from "./dto/tutorial-category.dto";
import { ObjectiveType, MissionPeriod } from "./entity/mission.entity";
import type { UserMission } from "./entity/user-mission.entity";

const TUTORIAL_CATEGORY_LABELS: Record<string, string> = {
  drawing: "그리기",
  explore: "둘러보기",
  share: "공유",
};

export class MissionMapper {
  static toResponse(
    missions: UserMission[],
    tutorialMissions: UserMission[] = [],
  ): MyMissionsResponseDto {
    const dailyMissions = missions
      .filter((uq) => uq.mission.period === MissionPeriod.DAILY)
      .map(MissionMapper.toMyMission);

    const weeklyMissions = missions
      .filter((uq) => uq.mission.period === MissionPeriod.WEEKLY)
      .map(MissionMapper.toMyMission);

    const tutorialCategories =
      MissionMapper.buildTutorialCategories(tutorialMissions);

    return { dailyMissions, weeklyMissions, tutorialCategories };
  }

  private static readonly toMyMission = (uq: UserMission): MyMission => ({
    userMissionId: Number(uq.id),
    missionId: Number(uq.mission.id),
    title: uq.mission.title,
    currentCount: uq.currentCount,
    requiredCount: uq.mission.requiredCount,
    rewardType: uq.mission.rewardType,
    rewardAmount: uq.mission.rewardAmount,
  });

  private static buildTutorialCategories(
    tutorialMissions: UserMission[],
  ): TutorialCategoryDto[] {
    if (tutorialMissions.length === 0) return [];

    const metaByCategory = new Map<string, UserMission>();
    const missionsByCategory = new Map<string, UserMission[]>();

    for (const uq of tutorialMissions) {
      const category = uq.mission.category;
      if (!category) continue;

      if (uq.mission.objectiveType === ObjectiveType.TUTORIAL_COMPLETED) {
        metaByCategory.set(category, uq);
      } else {
        const list = missionsByCategory.get(category) ?? [];
        list.push(uq);
        missionsByCategory.set(category, list);
      }
    }

    const categories: TutorialCategoryDto[] = [];
    for (const [category, missions] of missionsByCategory) {
      const meta = metaByCategory.get(category);
      categories.push({
        category,
        label: TUTORIAL_CATEGORY_LABELS[category] ?? category,
        rewardAmount: meta?.mission.rewardAmount ?? 0,
        isCompleted: meta?.completedAt != null,
        missions: missions.map(MissionMapper.toMyMission),
      });
    }

    return categories;
  }
}
