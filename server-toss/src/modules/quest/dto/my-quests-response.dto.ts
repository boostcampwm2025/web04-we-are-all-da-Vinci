export interface MyQuest {
  userQuestId: number;
  questId: number;
  title: string;
  currentCount: number;
  requiredCount: number;
  rewardType: string;
  rewardAmount: number;
}

export interface TutorialCategoryDto {
  category: string;
  label: string;
  rewardAmount: number;
  isCompleted: boolean;
  quests: MyQuest[];
}

export class MyQuestsResponseDto {
  dailyQuests!: MyQuest[];
  weeklyQuests!: MyQuest[];
  tutorialCategories!: TutorialCategoryDto[];
}
