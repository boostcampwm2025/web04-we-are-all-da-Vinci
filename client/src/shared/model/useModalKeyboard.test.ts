import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useModalKeyboard } from './useModalKeyboard';

const pressKey = (key: string) => fireEvent.keyDown(window, { key });

describe('useModalKeyboard', () => {
  describe('옵션을 생략했을 때의 기본값', () => {
    it('confirmDisabled 기본값은 false라서 Enter로 확인된다', () => {
      const onConfirm = vi.fn();
      renderHook(() =>
        useModalKeyboard({ isOpen: true, onConfirm, onClose: vi.fn() }),
      );

      pressKey('Enter');

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('showCancel 기본값은 false라서 ESC로 닫히지 않는다', () => {
      const onClose = vi.fn();
      renderHook(() =>
        useModalKeyboard({ isOpen: true, onConfirm: vi.fn(), onClose }),
      );

      pressKey('Escape');

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it('isOpen이 false면 어떤 키에도 반응하지 않는다', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    renderHook(() =>
      useModalKeyboard({
        isOpen: false,
        onConfirm,
        onClose,
        showCancel: true,
      }),
    );

    pressKey('Enter');
    pressKey('Escape');

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('언마운트되면 리스너가 해제된다', () => {
    const onConfirm = vi.fn();
    const { unmount } = renderHook(() =>
      useModalKeyboard({ isOpen: true, onConfirm, onClose: vi.fn() }),
    );

    unmount();
    pressKey('Enter');

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
