import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToastType } from '@/shared/model';
import Toast from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('타입별 표시', () => {
    it.each<[ToastType, string, string]>([
      ['success', 'check_circle', 'bg-green-400'],
      ['error', 'cancel', 'bg-red-400'],
      ['info', 'info', 'bg-blue-400'],
    ])(
      'type="%s"면 %s 아이콘과 %s 배경으로 메시지를 표시한다',
      (type, icon, bg) => {
        render(
          <Toast
            message="링크가 복사되었습니다!"
            type={type}
            onClose={vi.fn()}
          />,
        );

        const message = screen.getByText('링크가 복사되었습니다!');

        expect(message).toBeInTheDocument();
        expect(screen.getByText(icon)).toBeInTheDocument();
        expect(message.parentElement).toHaveClass(bg);
      },
    );
  });

  it('등장 애니메이션(--animate-toast)을 적용한다', () => {
    render(<Toast message="안내" type="info" onClose={vi.fn()} />);

    expect(
      screen.getByText('안내').parentElement!.getAttribute('style'),
    ).toContain('var(--animate-toast)');
  });

  describe('자동 닫힘', () => {
    it('duration을 생략하면 2000ms 뒤에 onClose가 호출된다', () => {
      const onClose = vi.fn();
      render(<Toast message="저장 완료" type="success" onClose={onClose} />);

      act(() => {
        vi.advanceTimersByTime(1999);
      });
      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('duration을 지정하면 해당 시간 뒤에 onClose가 호출된다', () => {
      const onClose = vi.fn();
      render(
        <Toast message="오류" type="error" onClose={onClose} duration={5000} />,
      );

      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('시간이 더 지나도 onClose는 한 번만 호출된다', () => {
      const onClose = vi.fn();
      render(<Toast message="안내" type="info" onClose={onClose} />);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('duration 전에 언마운트되면 타이머가 정리되어 onClose가 호출되지 않는다', () => {
      const onClose = vi.fn();
      const { unmount } = render(
        <Toast message="안내" type="info" onClose={onClose} />,
      );

      unmount();
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
