export interface TodayMissionItem {
  missionId: number;
  title: string;
  rewardAmount: number;
  done: boolean;
}

export class TodayMissionsResponseDto {
  missions!: TodayMissionItem[];
}
