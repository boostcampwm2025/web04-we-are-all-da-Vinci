import type { MyMission } from "./my-missions-response.dto";

export interface TutorialCategoryDto {
  category: string;
  label: string;
  rewardAmount: number;
  isCompleted: boolean;
  missions: MyMission[];
}
