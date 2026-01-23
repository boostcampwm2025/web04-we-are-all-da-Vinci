export interface Player {
  socketId: string;
  nickname: string;
  profileId: string;
  isHost?: boolean; // 모든 플레이어가 반드시 방에 들어와 있지 않다.
}
