import { fetchJson } from '@/shared/api/rest';

interface CreateRoomRequest {
  maxPlayer: number;
  totalRounds: number;
  drawingTime: number;
}

interface CreateRoomResponse {
  roomId: string;
}

export async function createRoom(
  settings: CreateRoomRequest,
): Promise<CreateRoomResponse> {
  return fetchJson<CreateRoomResponse>('/room', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}
