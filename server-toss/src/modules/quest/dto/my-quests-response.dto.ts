import type { TutorialCategoryDto } from "./tutorial-category.dto";

export interface MyQuest {
  userQuestId: number;
  questId: number;
  title: string;
  currentCount: number;
  requiredCount: number;
  rewardType: string;
  rewardAmount: number;
}

export class MyQuestsResponseDto {
  dailyQuests!: MyQuest[];
  weeklyQuests!: MyQuest[];
  tutorialCategories!: TutorialCategoryDto[];
}
