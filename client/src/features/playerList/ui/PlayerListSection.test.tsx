import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PlayerListSection } from './PlayerListSection';
import { useGameStore } from '@/entities/gameRoom';
import type { Player } from '@/entities/player/model';
import * as socket from '@/shared/api/socket';

vi.mock('@/shared/api/socket', () => ({
  getSocket: vi.fn(() => ({
    emit: vi.fn(),
  })),
}));

const createMockPlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, i) => ({
    socketId: `socket-${i + 1}`,
    nickname: `플레이어 ${i + 1}`,
    profileId: `profile-${(i % 8) + 1}`,
    isHost: i === 0,
  }));

describe('PlayerListSection', () => {
  beforeEach(() => {
    useGameStore.setState({
      roomId: 'TEST123',
      settings: {
        drawingTime: 90,
        totalRounds: 5,
        maxPlayer: 4,
      },
      mySocketId: 'socket-1',
    });
  });

  describe('최소 인원 제한 (2명)', () => {
    it('잠금 슬롯 클릭 시 2명 미만으로 감소하지 않는다', () => {
      const players = createMockPlayers(3);
      const mockEmit = vi.fn();
      vi.spyOn(socket, 'getSocket').mockReturnValue({
        emit: mockEmit,
      } as any);

      useGameStore.setState({
        mySocketId: players[0].socketId,
        settings: {
          drawingTime: 90,
          totalRounds: 5,
          maxPlayer: 4,
        },
      });

      render(
        <MemoryRouter>
          <PlayerListSection players={players} maxPlayer={4} />
        </MemoryRouter>,
      );

      // index 1 (2번째 슬롯)을 클릭하면 maxPlayer가 1이 되려고 시도
      // 하지만 2명 미만으로는 설정할 수 없음
      const emptySlot = screen.getAllByText('빈자리')[0];
      emptySlot.click();

      // ROOM_SETTINGS 이벤트가 호출되지 않아야 함
      expect(mockEmit).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          maxPlayer: 1,
        }),
      );
    });

    it('잠금 해제 시 2명 미만으로 감소하지 않는다', () => {
      const players = createMockPlayers(2);
      const mockEmit = vi.fn();
      vi.spyOn(socket, 'getSocket').mockReturnValue({
        emit: mockEmit,
      } as any);

      useGameStore.setState({
        mySocketId: players[0].socketId,
        settings: {
          drawingTime: 90,
          totalRounds: 5,
          maxPlayer: 3,
        },
      });

      render(
        <MemoryRouter>
          <PlayerListSection players={players} maxPlayer={3} />
        </MemoryRouter>,
      );

      // index 1 잠금 슬롯을 클릭하여 해제하려고 시도 (maxPlayer를 2로)
      const lockedSlots = screen.getAllByText('잠금');
      if (lockedSlots.length > 0) {
        lockedSlots[0].click();
      }

      // maxPlayer를 1로 설정하려는 시도는 막혀야 함
      expect(mockEmit).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          maxPlayer: 1,
        }),
      );
    });
  });
});
