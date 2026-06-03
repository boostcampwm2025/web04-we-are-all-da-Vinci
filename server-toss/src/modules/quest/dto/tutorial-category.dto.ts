import type { MyQuest } from "./my-quests-response.dto";

export interface TutorialCategoryDto {
  category: string;
  label: string;
  rewardAmount: number;
  isCompleted: boolean;
  quests: MyQuest[];
}
