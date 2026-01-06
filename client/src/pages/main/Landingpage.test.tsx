import * as createRoomAPI from '@/features/roomSettings';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './Landingpage';

// Mock modules
vi.mock('@/features/roomSettings', async () => {
  const actual = await vi.importActual('@/features/roomSettings');
  return {
    ...actual,
    createRoom: vi.fn(),
  };
});
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('랜딩페이지 - 방 생성', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('"방 만들기" 클릭 시 방 설정 모달을 표시한다', async () => {
    localStorage.setItem('nickname', 'TestUser');
    renderWithRouter(<LandingPage />);

    const createRoomButton = screen.getByText('방 만들기');
    fireEvent.click(createRoomButton);

    await waitFor(() => {
      expect(screen.getByText('방 설정')).toBeInTheDocument();
    });
  });

  it('올바른 설정으로 방 생성 API를 호출한다', async () => {
    const mockCreateRoom = vi
      .spyOn(createRoomAPI, 'createRoom')
      .mockResolvedValue({ roomId: 'test123' });

    localStorage.setItem('nickname', 'TestUser');
    renderWithRouter(<LandingPage />);

    // 방 설정 모달 열기
    const createRoomButton = screen.getByText('방 만들기');
    fireEvent.click(createRoomButton);

    await waitFor(() => {
      expect(screen.getByText('방 설정')).toBeInTheDocument();
    });

    // 설정 선택 (기본값: 4명, 5라운드, 90초)
    const completeButton = screen.getByText('완료');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockCreateRoom).toHaveBeenCalledWith({
        maxPlayer: 4,
        totalRounds: 5,
        drawingTime: 90,
      });
    });
  });

  it('방 생성 API 에러를 처리한다', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    vi.spyOn(createRoomAPI, 'createRoom').mockRejectedValue(
      new Error('API Error'),
    );

    localStorage.setItem('nickname', 'TestUser');
    renderWithRouter(<LandingPage />);

    const createRoomButton = screen.getByText('방 만들기');
    fireEvent.click(createRoomButton);

    await waitFor(() => {
      expect(screen.getByText('방 설정')).toBeInTheDocument();
    });

    const completeButton = screen.getByText('완료');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create room:',
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('방 생성 성공 후 설정 모달을 닫는다', async () => {
    vi.spyOn(createRoomAPI, 'createRoom').mockResolvedValue({
      roomId: 'abc123',
    });

    localStorage.setItem('nickname', 'TestUser');
    renderWithRouter(<LandingPage />);

    const createRoomButton = screen.getByText('방 만들기');
    fireEvent.click(createRoomButton);

    await waitFor(() => {
      expect(screen.getByText('방 설정')).toBeInTheDocument();
    });

    const completeButton = screen.getByText('완료');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.queryByText('방 설정')).not.toBeInTheDocument();
    });
  });
});
