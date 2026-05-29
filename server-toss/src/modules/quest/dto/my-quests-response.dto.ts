export interface MyQuest {
  userQuestId: bigint;
  questId: bigint;
  title: string;
  currentCount: number;
  requiredCount: number;
  rewardType: string;
  rewardAmount: number;
}

export class MyQuestsResponseDto {
  dailyQuests!: MyQuest[];
  weeklyQuests!: MyQuest[];
}
