import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoom } from './createRoom';

describe('방 생성 API', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('올바른 설정으로 POST 요청을 보낸다', async () => {
    const mockResponse = { roomId: 'abc12345' };
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const settings = {
      maxPlayer: 4, // playerOptions: [2, 3, 4, 5, 6, 8]
      totalRounds: 5, // roundOptions: [3, 5, 7, 10]
      drawingTime: 60, // timeOptions: [15, 30, 45, 60]
    };

    const result = await createRoom(settings);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/room',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(settings),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it('응답에서 roomId를 반환한다', async () => {
    const mockRoomId = 'xyz98765';
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ roomId: mockRoomId }),
    } as Response);

    const result = await createRoom({
      maxPlayer: 6, // playerOptions: [2, 3, 4, 5, 6, 8]
      totalRounds: 10, // roundOptions: [3, 5, 7, 10]
      drawingTime: 45, // timeOptions: [15, 30, 45, 60]
    });

    expect(result.roomId).toBe(mockRoomId);
  });

  it('응답이 실패하면 에러를 던진다', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    await expect(
      createRoom({
        maxPlayer: 4, // playerOptions: [2, 3, 4, 5, 6, 8]
        totalRounds: 5, // roundOptions: [3, 5, 7, 10]
        drawingTime: 30, // timeOptions: [15, 30, 45, 60]
      }),
    ).rejects.toThrow('HTTP error! status: 500');
  });

  it('다양한 설정을 올바르게 전송한다', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ roomId: 'test123' }),
    } as Response);

    const customSettings = {
      maxPlayer: 8, // playerOptions: [2, 3, 4, 5, 6, 8]
      totalRounds: 3, // roundOptions: [3, 5, 7, 10]
      drawingTime: 15, // timeOptions: [15, 30, 45, 60]
    };

    await createRoom(customSettings);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify(customSettings),
      }),
    );
  });
});
