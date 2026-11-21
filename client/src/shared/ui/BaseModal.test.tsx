import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import BaseModal from './BaseModal';

type BaseModalProps = Parameters<typeof BaseModal>[0];

const renderModal = (props: Partial<BaseModalProps> = {}) => {
  const handlers = { onClose: vi.fn(), onConfirm: vi.fn() };
  const utils = render(
    <MemoryRouter>
      <BaseModal isOpen title="게임 설명서" {...handlers} {...props} />
    </MemoryRouter>,
  );
  return { ...handlers, ...props, ...utils };
};

const pressKey = (key: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(window, { key, ...init });

describe('BaseModal', () => {
  describe('렌더링', () => {
    it('isOpen이 false면 아무것도 렌더링하지 않는다', () => {
      renderModal({ isOpen: false });

      expect(screen.queryByText('게임 설명서')).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('isOpen이 true면 제목·메시지·children을 렌더링한다', () => {
      renderModal({
        message: '그림을 기억해서 그리세요',
        children: <p>추가 콘텐츠</p>,
      });

      expect(
        screen.getByRole('heading', { name: '게임 설명서' }),
      ).toBeInTheDocument();
      expect(screen.getByText('그림을 기억해서 그리세요')).toBeInTheDocument();
      expect(screen.getByText('추가 콘텐츠')).toBeInTheDocument();
    });

    it('confirmText를 생략하면 확인 버튼 문구는 "확인"이다', () => {
      renderModal();

      expect(screen.getByRole('button', { name: /확인/ })).toBeInTheDocument();
    });

    it('confirmText로 확인 버튼 문구를 바꿀 수 있다', () => {
      renderModal({ confirmText: '저장' });

      expect(screen.getByRole('button', { name: /저장/ })).toBeInTheDocument();
    });
  });

  describe('버튼 동작', () => {
    it('확인 버튼을 클릭하면 onConfirm이 호출된다', () => {
      const { onConfirm } = renderModal();

      fireEvent.click(screen.getByRole('button', { name: /확인/ }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('showCancel이 false면 닫기 버튼이 없다', () => {
      renderModal();

      expect(
        screen.queryByRole('button', { name: /닫기/ }),
      ).not.toBeInTheDocument();
    });

    it('showCancel이 true면 닫기 버튼 클릭 시 onClose가 호출된다', () => {
      const { onClose, onConfirm } = renderModal({ showCancel: true });

      fireEvent.click(screen.getByRole('button', { name: /닫기/ }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('confirmDisabled면 확인 버튼이 비활성화되고 클릭해도 onConfirm이 호출되지 않는다', () => {
      const { onConfirm } = renderModal({ confirmDisabled: true });

      const confirm = screen.getByRole('button', { name: /확인/ });
      fireEvent.click(confirm);

      expect(confirm).toBeDisabled();
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('키보드 동작', () => {
    it('Enter를 누르면 onConfirm이 호출된다', () => {
      const { onConfirm } = renderModal();

      pressKey('Enter');

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('confirmDisabled면 Enter를 눌러도 onConfirm이 호출되지 않는다', () => {
      const { onConfirm } = renderModal({ confirmDisabled: true });

      pressKey('Enter');

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('한글 조합 중(isComposing) Enter는 무시된다', () => {
      const { onConfirm } = renderModal();

      pressKey('Enter', { isComposing: true });

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('showCancel이 true면 ESC로 닫힌다(onClose)', () => {
      const { onClose } = renderModal({ showCancel: true });

      pressKey('Escape');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('showCancel이 false면 ESC로 닫히지 않는다 (닉네임 설정처럼 필수 모달)', () => {
      const { onClose } = renderModal({ showCancel: false });

      pressKey('Escape');

      expect(onClose).not.toHaveBeenCalled();
    });

    it('모달이 닫히면 키보드 리스너가 해제되어 Enter·ESC에 반응하지 않는다', () => {
      const { onConfirm, onClose, rerender } = renderModal({
        showCancel: true,
      });

      rerender(
        <MemoryRouter>
          <BaseModal
            isOpen={false}
            title="게임 설명서"
            onClose={onClose}
            onConfirm={onConfirm}
            showCancel
          />
        </MemoryRouter>,
      );
      pressKey('Enter');
      pressKey('Escape');

      expect(onConfirm).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('키보드 우선순위', () => {
    it('showCancel이 true여도 Enter는 닫기가 아니라 확인(onConfirm)이다', () => {
      const { onConfirm, onClose } = renderModal({ showCancel: true });

      pressKey('Enter');

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('Enter·ESC 이외의 키에는 반응하지 않는다', () => {
      const { onConfirm, onClose } = renderModal({ showCancel: true });

      pressKey('a');
      pressKey('Tab');
      pressKey(' ');

      expect(onConfirm).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('메시지', () => {
    it('message의 줄바꿈(\\n)을 유지해서 보여준다 (whitespace-pre-line)', () => {
      renderModal({ message: '1. 방을 만드세요.\n2. 그림을 그리세요.' });

      expect(screen.getByText(/1\. 방을 만드세요\./)).toHaveClass(
        'whitespace-pre-line',
      );
    });

    it('message가 없으면 빈 문단을 렌더링하지 않는다', () => {
      const { container } = renderModal();

      expect(container.querySelector('p')).not.toBeInTheDocument();
    });
  });

  describe('variant', () => {
    const modalCard = () =>
      screen.getByRole('heading', { name: '게임 설명서' }).parentElement!;

    it('variant를 생략하면 손그림 테두리(scribble) 카드로 렌더링한다', () => {
      renderModal();

      expect(modalCard()).toHaveClass('scribble-border', 'scribble-border-box');
    });

    it('variant="default"면 손그림 테두리 없이 일반 카드로 렌더링한다', () => {
      renderModal({ variant: 'default' });

      expect(modalCard()).toHaveClass('rounded-2xl', 'max-w-md');
      expect(modalCard()).not.toHaveClass('scribble-border');
    });

    it('buttonVariant="scribble"(기본값)이면 손그림 테두리 버튼과 아이콘(check_circle·close)을 사용한다', () => {
      renderModal({ showCancel: true });

      expect(screen.getByRole('button', { name: /확인/ })).toHaveClass(
        'scribble-border',
      );
      expect(screen.getByText('check_circle')).toBeInTheDocument();
      expect(screen.getByText('close')).toBeInTheDocument();
    });

    it('buttonVariant="default"면 아이콘 없는 radius 버튼(rounded-xl)을 사용한다', () => {
      const { container } = renderModal({
        buttonVariant: 'default',
        showCancel: true,
      });

      const confirm = screen.getByRole('button', { name: '확인' });

      expect(confirm).toHaveClass('rounded-xl');
      expect(confirm).not.toHaveClass('scribble-border');
      expect(screen.getByRole('button', { name: '닫기' })).toHaveClass(
        'border-gray-400',
      );
      expect(
        container.querySelector('.material-symbols-outlined'),
      ).not.toBeInTheDocument();
    });
  });
});
