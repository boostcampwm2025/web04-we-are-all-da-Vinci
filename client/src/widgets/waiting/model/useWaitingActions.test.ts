import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWaitingActions } from './useWaitingActions';
import { getSocket } from '@/shared/api';
import { SERVER_EVENTS } from '@/shared/config';
import { trackEvent } from '@/shared/lib/mixpanel';
import { useToastStore } from '@/shared/model';

vi.mock('@/shared/api', () => ({
  getSocket: vi.fn(),
}));

vi.mock('@/shared/lib/mixpanel', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/shared/model', () => ({
  useToastStore: vi.fn(),
}));

describe('useWaitingActions', () => {
  const mockEmit = vi.fn();
  const mockAddToast = vi.fn();

  const defaultProps = {
    roomId: 'test-room-123',
    isHostUser: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getSocket as any).mockReturnValue({ emit: mockEmit });
    (useToastStore as any).mockReturnValue({ addToast: mockAddToast });

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    Object.defineProperty(globalThis, 'location', {
      value: { href: 'https://example.com/room/test-room-123' },
      writable: true,
    });
  });

  describe('모달 상태 관리', () => {
    it('초기 상태에서 모달은 닫혀있어야 한다', () => {
      const { result } = renderHook(() => useWaitingActions(defaultProps));

      expect(result.current.showSettingsModal).toBe(false);
    });

    it('handleSettingsChange 호출 시 모달이 열려야 한다', () => {
      const { result } = renderHook(() => useWaitingActions(defaultProps));

      act(() => {
        result.current.handleSettingsChange();
      });

      expect(result.current.showSettingsModal).toBe(true);
    });

    it('setShowSettingsModal(false) 호출 시 모달이 닫혀야 한다', () => {
      const { result } = renderHook(() => useWaitingActions(defaultProps));

      act(() => {
        result.current.handleSettingsChange();
      });
      expect(result.current.showSettingsModal).toBe(true);

      act(() => {
        result.current.setShowSettingsModal(false);
      });
      expect(result.current.showSettingsModal).toBe(false);
    });
  });

  describe('방 아이디 복사', () => {
    it('복사 성공 시 클립보드에 URL이 복사되고 성공 토스트가 표시되어야 한다', async () => {
      const { result } = renderHook(() => useWaitingActions(defaultProps));

      await act(async () => {
        await result.current.copyRoomId();
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://example.com/room/test-room-123',
      );
      expect(trackEvent).toHaveBeenCalled();
      expect(mockAddToast).toHaveBeenCalledWith(
        '초대 링크가 복사되었습니다!',
        'success',
      );
    });

    it('복사 실패 시 에러 토스트가 표시되어야 한다', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (navigator.clipboard.writeText as any).mockRejectedValue(
        new Error('Clipboard error'),
      );

      const { result } = renderHook(() => useWaitingActions(defaultProps));

      await act(async () => {
        await result.current.copyRoomId();
      });

      expect(mockAddToast).toHaveBeenCalledWith(
        '링크 복사에 실패했습니다.',
        'error',
      );
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('설정 변경', () => {
    it('설정 완료 시 소켓으로 설정이 전송되어야 한다', () => {
      const { result } = renderHook(() => useWaitingActions(defaultProps));

      const newSettings = {
        maxPlayers: 6,
        totalRounds: 5,
        drawingTime: 30,
      };

      act(() => {
        result.current.handleSettingsComplete(newSettings);
      });

      expect(mockEmit).toHaveBeenCalledWith(SERVER_EVENTS.ROOM_SETTINGS, {
        roomId: 'test-room-123',
        maxPlayer: 6,
        totalRounds: 5,
        drawingTime: 30,
      });
    });

    it('설정 완료 후 모달이 닫혀야 한다', () => {
      const { result } = renderHook(() => useWaitingActions(defaultProps));

      act(() => {
        result.current.handleSettingsChange();
      });
      expect(result.current.showSettingsModal).toBe(true);

      act(() => {
        result.current.handleSettingsComplete({
          maxPlayers: 4,
          totalRounds: 3,
          drawingTime: 15,
        });
      });

      expect(result.current.showSettingsModal).toBe(false);
    });
  });

  describe('게임 시작', () => {
    it('방장일 때 게임 시작이 가능해야 한다', () => {
      const { result } = renderHook(() =>
        useWaitingActions({ roomId: 'test-room', isHostUser: true }),
      );

      act(() => {
        result.current.handleStartGame();
      });

      expect(mockEmit).toHaveBeenCalledWith(SERVER_EVENTS.ROOM_START, {
        roomId: 'test-room',
      });
    });

    it('방장이 아니면 게임 시작이 불가해야 한다', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const { result } = renderHook(() =>
        useWaitingActions({ roomId: 'test-room', isHostUser: false }),
      );

      act(() => {
        result.current.handleStartGame();
      });

      expect(mockEmit).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Cannot start game: 방장만 가능',
      );

      consoleErrorSpy.mockRestore();
    });

    it('roomId가 없으면 게임 시작이 불가해야 한다', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const { result } = renderHook(() =>
        useWaitingActions({ roomId: '', isHostUser: true }),
      );

      act(() => {
        result.current.handleStartGame();
      });

      expect(mockEmit).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Cannot start game: 룸아이디가 있어야 가능',
      );

      consoleErrorSpy.mockRestore();
    });

    it('roomId가 없고 방장도 아니면 roomId 에러가 먼저 발생해야 한다', () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const { result } = renderHook(() =>
        useWaitingActions({ roomId: '', isHostUser: false }),
      );

      act(() => {
        result.current.handleStartGame();
      });

      expect(mockEmit).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Cannot start game: 룸아이디가 있어야 가능',
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });
  });
});
