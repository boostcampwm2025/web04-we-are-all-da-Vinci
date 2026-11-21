import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import OverlayModal from './OverlayModal';

type OverlayModalProps = Parameters<typeof OverlayModal>[0];

const renderModal = (props: Partial<OverlayModalProps> = {}) => {
  const handlers = { onClose: vi.fn(), onConfirm: vi.fn() };
  const utils = render(
    <MemoryRouter>
      <OverlayModal isOpen title="오류" {...handlers} {...props} />
    </MemoryRouter>,
  );
  return { ...handlers, ...props, ...utils };
};

describe('OverlayModal', () => {
  describe('렌더링 · 접근성', () => {
    it('isOpen이 false면 아무것도 렌더링하지 않는다', () => {
      renderModal({ isOpen: false });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('열리면 aria-modal dialog로 렌더링된다', () => {
      renderModal();

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('제목이 dialog의 접근 가능한 이름이 된다 (aria-labelledby)', () => {
      renderModal({ title: '피카소님을 퇴장시키겠습니까?' });

      expect(
        screen.getByRole('dialog', { name: '피카소님을 퇴장시키겠습니까?' }),
      ).toBeInTheDocument();
    });

    it('message가 있으면 dialog의 설명이 된다 (aria-describedby)', () => {
      renderModal({ message: '방 생성에 실패했습니다.' });

      expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
        '방 생성에 실패했습니다.',
      );
    });

    it('message가 없으면 aria-describedby를 설정하지 않는다', () => {
      renderModal();

      expect(screen.getByRole('dialog')).not.toHaveAttribute(
        'aria-describedby',
      );
    });
  });

  describe('닫기 동작', () => {
    it('바깥(배경)을 클릭하면 onClose가 호출된다', () => {
      const { onClose } = renderModal();

      const backdrop = screen.getByRole('dialog').parentElement!;
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('모달 내부를 클릭하면 onClose가 호출되지 않는다', () => {
      const { onClose } = renderModal({ message: '내용' });

      fireEvent.click(screen.getByText('내용'));
      fireEvent.click(screen.getByRole('dialog'));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('버튼 동작', () => {
    it('확인 버튼을 클릭하면 onConfirm만 호출되고 배경 클릭(onClose)으로 전파되지 않는다', () => {
      const { onConfirm, onClose } = renderModal();

      fireEvent.click(screen.getByRole('button', { name: /확인/ }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('onCancel이 없으면 확인 버튼 하나만 렌더링한다', () => {
      renderModal();

      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('onCancel이 있으면 취소 버튼 클릭 시 onCancel이 호출된다', () => {
      const onCancel = vi.fn();
      const { onClose, onConfirm } = renderModal({ onCancel });

      fireEvent.click(screen.getByRole('button', { name: /취소/ }));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('confirmText·cancelText로 버튼 문구를 바꿀 수 있다', () => {
      renderModal({
        onCancel: vi.fn(),
        confirmText: '퇴장',
        cancelText: '돌아가기',
      });

      expect(screen.getByRole('button', { name: /퇴장/ })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /돌아가기/ }),
      ).toBeInTheDocument();
    });
  });

  describe('variant', () => {
    it('variant를 생략하면 손그림 테두리(scribble) dialog로 렌더링한다', () => {
      renderModal();

      expect(screen.getByRole('dialog')).toHaveClass(
        'scribble-border',
        'scribble-border-box',
      );
    });

    it('variant="default"면 손그림 테두리 없는 일반 dialog로 렌더링한다', () => {
      renderModal({ variant: 'default' });

      const dialog = screen.getByRole('dialog');

      expect(dialog).toHaveClass('rounded-2xl', 'max-w-md');
      expect(dialog).not.toHaveClass('scribble-border');
    });

    it('buttonVariant를 생략하면 lg 크기 scribble 버튼과 아이콘(check_circle·cancel)을 사용한다', () => {
      renderModal({ onCancel: vi.fn() });

      const confirm = screen.getByRole('button', { name: /확인/ });

      expect(confirm).toHaveClass('scribble-border', 'h-16');
      expect(screen.getByText('check_circle')).toBeInTheDocument();
      expect(screen.getByText('cancel')).toBeInTheDocument();
    });

    it('buttonVariant="default"면 아이콘 없는 md 크기 radius 버튼(파랑 확인·회색 취소)을 사용한다', () => {
      const { container } = renderModal({
        buttonVariant: 'default',
        onCancel: vi.fn(),
      });

      expect(screen.getByRole('button', { name: '확인' })).toHaveClass(
        'rounded-xl',
        'h-12',
        'border-blue-400',
      );
      expect(screen.getByRole('button', { name: '취소' })).toHaveClass(
        'border-gray-400',
      );
      expect(
        container.querySelector('.material-symbols-outlined'),
      ).not.toBeInTheDocument();
    });

    it('message의 줄바꿈(\\n)을 유지해서 보여준다 (whitespace-pre-line)', () => {
      renderModal({ message: '첫 줄\n둘째 줄' });

      expect(screen.getByText(/첫 줄/)).toHaveClass('whitespace-pre-line');
    });
  });
});
