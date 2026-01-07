import { fetchClient } from '@/shared/api/rest';

interface CreateRoomRequest {
  maxPlayer: number;
  totalRounds: number;
  drawingTime: number;
}

interface CreateRoomResponse {
  roomId: string;
}

export const createRoom = async (
  settings: CreateRoomRequest,
): Promise<CreateRoomResponse> => {
  return fetchClient<CreateRoomResponse, CreateRoomRequest>('/room', {
    method: 'POST',
    body: settings,
  });
};
