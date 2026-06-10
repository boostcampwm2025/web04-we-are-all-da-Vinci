interface PodiumEntry {
  nickname: string;
  score: number;
}

interface PodiumResponse {
  podium: PodiumEntry[];
  /** 오늘(KST) 랭킹에 제출한 전체 참가자 수 */
  participantCount: number;
}

export { type PodiumEntry, type PodiumResponse };
