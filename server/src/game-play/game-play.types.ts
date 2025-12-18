export type RoomState = 'WAITING' | 'PLAYING' | 'ENDED';

export type Player = {
  id: string;
  userId: string;
  score: number;
  drawing: number[][];
  isHost: boolean;
};

export type Room = {
  roomId: string;
  state: RoomState;
  players: Map<string, Player>;
  submitCount: number;
};
