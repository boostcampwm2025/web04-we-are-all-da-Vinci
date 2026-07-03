import type { TutorialCategoryDto } from "./tutorial-category.dto";

export interface MyMission {
  userMissionId: number;
  missionId: number;
  title: string;
  objectiveType: string;
  currentCount: number;
  requiredCount: number;
  rewardType: string;
  rewardAmount: number;
}

export class MyMissionsResponseDto {
  dailyMissions!: MyMission[];
  weeklyMissions!: MyMission[];
  tutorialCategories!: TutorialCategoryDto[];
}
