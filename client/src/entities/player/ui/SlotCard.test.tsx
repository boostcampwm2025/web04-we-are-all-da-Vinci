import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SlotCard } from './SlotCard';

describe('SlotCard', () => {
  describe('빈자리 슬롯 (empty variant)', () => {
    it('기본 상태에서 "빈자리" 텍스트와 person 아이콘을 표시한다', () => {
      render(<SlotCard variant="empty" />);

      expect(screen.getByText('빈자리')).toBeInTheDocument();
      expect(screen.getByText('person')).toBeInTheDocument();
    });

    it('isInteractive=false일 때 cursor-not-allowed 클래스를 가진다', () => {
      const { container } = render(
        <SlotCard variant="empty" isInteractive={false} />,
      );

      const slotCard = container.querySelector('div');
      expect(slotCard?.className).toContain('cursor-not-allowed');
    });

    it('isInteractive=true일 때 cursor-pointer 클래스를 가진다', () => {
      const { container } = render(
        <SlotCard variant="empty" isInteractive={true} />,
      );

      const slotCard = container.querySelector('div');
      expect(slotCard?.className).toContain('cursor-pointer');
    });

    it('하이라이트 상태에서 "클릭하여 잠금" 텍스트와 lock 아이콘을 표시한다', () => {
      render(
        <SlotCard variant="empty" isInteractive={true} isHighlighted={true} />,
      );

      expect(screen.getByText('클릭하여 잠금')).toBeInTheDocument();
      expect(screen.getByText('lock')).toBeInTheDocument();
    });

    it('하이라이트 상태에서 주황색 스타일을 적용한다', () => {
      const { container } = render(
        <SlotCard variant="empty" isInteractive={true} isHighlighted={true} />,
      );

      const slotCard = container.querySelector('div');
      expect(slotCard?.className).toContain('border-orange-400');
      expect(slotCard?.className).toContain('bg-orange-50');
    });

    it('isInteractive=true일 때 onClick 핸들러가 호출된다', () => {
      const handleClick = vi.fn();
      render(
        <SlotCard variant="empty" isInteractive={true} onClick={handleClick} />,
      );

      const slotCard = screen.getByText('빈자리').closest('div');
      slotCard?.click();

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('isInteractive=false일 때 onClick 핸들러가 호출되지 않는다', () => {
      const handleClick = vi.fn();
      render(
        <SlotCard
          variant="empty"
          isInteractive={false}
          onClick={handleClick}
        />,
      );

      const slotCard = screen.getByText('빈자리').closest('div');
      slotCard?.click();

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('잠금 슬롯 (locked variant)', () => {
    it('기본 상태에서 "잠금" 텍스트와 lock 아이콘을 표시한다', () => {
      render(<SlotCard variant="locked" />);

      expect(screen.getByText('잠금')).toBeInTheDocument();
      expect(screen.getByText('lock')).toBeInTheDocument();
    });

    it('기본 상태에서 회색 스타일과 대각선 패턴을 적용한다', () => {
      const { container } = render(<SlotCard variant="locked" />);

      const slotCard = container.querySelector('div');
      expect(slotCard?.className).toContain('bg-slate-100');
      expect(slotCard?.className).toContain('repeating-linear-gradient');
    });

    it('하이라이트 상태에서 "클릭하여 해제" 텍스트와 lock_open 아이콘을 표시한다', () => {
      render(
        <SlotCard variant="locked" isInteractive={true} isHighlighted={true} />,
      );

      expect(screen.getByText('클릭하여 해제')).toBeInTheDocument();
      expect(screen.getByText('lock_open')).toBeInTheDocument();
    });

    it('하이라이트 상태에서 초록색 스타일을 적용한다', () => {
      const { container } = render(
        <SlotCard variant="locked" isInteractive={true} isHighlighted={true} />,
      );

      const slotCard = container.querySelector('div');
      expect(slotCard?.className).toContain('border-green-400');
      expect(slotCard?.className).toContain('bg-green-50');
    });

    it('비활성화 상태(isInteractive=false)에서 opacity-70을 추가로 적용한다', () => {
      const { container } = render(
        <SlotCard variant="locked" isInteractive={false} />,
      );

      const slotCard = container.querySelector('div');
      expect(slotCard?.className).toContain('opacity-70');
    });
  });

  describe('마우스 이벤트', () => {
    it('onMouseEnter 핸들러가 호출된다', () => {
      const handleMouseEnter = vi.fn();
      render(<SlotCard variant="empty" onMouseEnter={handleMouseEnter} />);

      const slotCard = screen.getByText('빈자리').closest('div');
      if (slotCard) {
        fireEvent.mouseEnter(slotCard);
      }

      expect(handleMouseEnter).toHaveBeenCalledTimes(1);
    });

    it('onMouseLeave 핸들러가 호출된다', () => {
      const handleMouseLeave = vi.fn();
      render(<SlotCard variant="empty" onMouseLeave={handleMouseLeave} />);

      const slotCard = screen.getByText('빈자리').closest('div');
      if (slotCard) {
        fireEvent.mouseLeave(slotCard);
      }

      expect(handleMouseLeave).toHaveBeenCalledTimes(1);
    });
  });

  describe('상태 조합', () => {
    it('isInteractive=false && isHighlighted=true일 때 하이라이트가 적용되지 않는다', () => {
      const { container } = render(
        <SlotCard variant="empty" isInteractive={false} isHighlighted={true} />,
      );

      // showHighlighted = isInteractive && isHighlighted = false
      expect(screen.getByText('빈자리')).toBeInTheDocument();
      expect(screen.queryByText('클릭하여 잠금')).not.toBeInTheDocument();

      const slotCard = container.querySelector('div');
      expect(slotCard?.className).not.toContain('border-orange-400');
    });
  });
});
