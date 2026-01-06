/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoom } from './createRoom';

describe('방 생성 API', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('올바른 설정으로 POST 요청을 보낸다', async () => {
    const mockResponse = { roomId: 'abc12345' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const settings = {
      maxPlayer: 4,
      totalRounds: 5,
      drawingTime: 90,
    };

    const result = await createRoom(settings);

    expect(global.fetch).toHaveBeenCalledWith(
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
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ roomId: mockRoomId }),
    });

    const result = await createRoom({
      maxPlayer: 6,
      totalRounds: 10,
      drawingTime: 120,
    });

    expect(result.roomId).toBe(mockRoomId);
  });

  it('응답이 실패하면 에러를 던진다', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(
      createRoom({
        maxPlayer: 4,
        totalRounds: 5,
        drawingTime: 90,
      }),
    ).rejects.toThrow('HTTP error! status: 500');
  });

  it('다양한 설정을 올바르게 전송한다', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ roomId: 'test123' }),
    });

    const customSettings = {
      maxPlayer: 20,
      totalRounds: 3,
      drawingTime: 60,
    };

    await createRoom(customSettings);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify(customSettings),
      }),
    );
  });
});
