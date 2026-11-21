import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Input from './Input';

describe('Input', () => {
  describe('입력값 반영', () => {
    it('입력하면 onChange에 문자열 값이 전달된다', () => {
      const onChange = vi.fn();
      render(<Input value="" onChange={onChange} placeholder="닉네임" />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '다빈치' },
      });

      expect(onChange).toHaveBeenCalledWith('다빈치');
    });

    it('value prop이 입력창에 그대로 표시된다', () => {
      render(<Input value="피카소" onChange={vi.fn()} />);

      expect(screen.getByRole('textbox')).toHaveValue('피카소');
    });

    it('ref로 실제 input 요소에 접근할 수 있다', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      expect(ref.current).toBe(screen.getByRole('textbox'));
    });
  });

  describe('maxLength 제한', () => {
    it('maxLength 이내의 입력은 onChange로 전달된다', () => {
      const onChange = vi.fn();
      render(<Input value="" onChange={onChange} maxLength={5} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '12345' },
      });

      expect(onChange).toHaveBeenCalledWith('12345');
    });

    it('maxLength를 초과하는 입력은 onChange로 전달되지 않는다', () => {
      const onChange = vi.fn();
      render(<Input value="" onChange={onChange} maxLength={5} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '123456' },
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('네이티브 maxLength 속성도 함께 설정된다', () => {
      render(<Input maxLength={10} />);

      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '10');
    });
  });

  describe('Enter 제출 (onEnter)', () => {
    const typeAndPressEnter = (value: string, init: KeyboardEventInit = {}) => {
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value } });
      fireEvent.keyDown(input, { key: 'Enter', ...init });
    };

    it('내용이 있을 때 Enter를 누르면 onEnter가 호출된다', () => {
      const onEnter = vi.fn();
      render(<Input onEnter={onEnter} />);

      typeAndPressEnter('안녕하세요');

      expect(onEnter).toHaveBeenCalledTimes(1);
    });

    it('빈 값이나 공백만 있으면 Enter를 눌러도 onEnter가 호출되지 않는다', () => {
      const onEnter = vi.fn();
      render(<Input onEnter={onEnter} />);

      typeAndPressEnter('');
      typeAndPressEnter('   ');

      expect(onEnter).not.toHaveBeenCalled();
    });

    it('한글 조합 중(isComposing) Enter는 무시되어 중복 전송을 막는다', () => {
      const onEnter = vi.fn();
      render(<Input onEnter={onEnter} />);

      typeAndPressEnter('안녕', { isComposing: true });

      expect(onEnter).not.toHaveBeenCalled();
    });

    it('Enter가 아닌 키는 onEnter를 호출하지 않는다', () => {
      const onEnter = vi.fn();
      render(<Input onEnter={onEnter} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '안녕' } });
      fireEvent.keyDown(input, { key: 'a' });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onEnter).not.toHaveBeenCalled();
    });
  });

  describe('글자 수 표시 (showCount)', () => {
    it('showCount와 maxLength가 있으면 "현재/최대" 글자 수를 표시한다', () => {
      render(
        <Input value="다빈치" onChange={vi.fn()} maxLength={20} showCount />,
      );

      expect(screen.getByText('3/20')).toBeInTheDocument();
    });

    it('showCount가 false면 글자 수를 표시하지 않는다', () => {
      render(<Input value="다빈치" onChange={vi.fn()} maxLength={20} />);

      expect(screen.queryByText('3/20')).not.toBeInTheDocument();
    });

    it('maxLength가 없으면 showCount여도 글자 수를 표시하지 않는다', () => {
      render(<Input value="다빈치" onChange={vi.fn()} showCount />);

      expect(screen.queryByText(/\/\d+/)).not.toBeInTheDocument();
    });

    it('비제어(value 없음) 입력에서는 showCount여도 오류 없이 글자 수를 생략한다', () => {
      render(<Input maxLength={20} showCount />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.queryByText(/\/20/)).not.toBeInTheDocument();
    });
  });

  describe('접근성 · variant', () => {
    it('ariaLabel이 없으면 placeholder를 접근 가능한 이름으로 사용한다', () => {
      render(<Input placeholder="메시지 입력..." />);

      expect(
        screen.getByRole('textbox', { name: '메시지 입력...' }),
      ).toBeInTheDocument();
    });

    it('ariaLabel이 있으면 placeholder보다 우선한다', () => {
      render(<Input placeholder="메시지 입력..." ariaLabel="채팅 입력" />);

      expect(
        screen.getByRole('textbox', { name: '채팅 입력' }),
      ).toBeInTheDocument();
    });

    it('autoFocus면 렌더링 직후 포커스를 가진다', () => {
      render(<Input autoFocus />);

      expect(screen.getByRole('textbox')).toHaveFocus();
    });

    it('autoFocus를 생략하면 렌더링 직후 포커스를 가져가지 않는다', () => {
      render(<Input />);

      expect(screen.getByRole('textbox')).not.toHaveFocus();
    });

    it('placeholder를 생략하면 빈 placeholder를 가진다', () => {
      render(<Input />);

      expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', '');
    });

    it('기본(default) variant는 테두리 있는 pill 입력창이고 래퍼는 글자 수 배치 기준(relative)이다', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');

      expect(input).toHaveClass('rounded-full', 'border-2');
      expect(input.parentElement).toHaveClass('relative');
      expect(input.parentElement).not.toHaveClass('scribble-border');
    });

    it('scribble variant는 손그림 테두리 래퍼로 감싸지고 입력창 자체는 투명 배경이다', () => {
      render(<Input variant="scribble" />);

      const input = screen.getByRole('textbox');

      expect(input.parentElement).toHaveClass('scribble-border', 'relative');
      expect(input).toHaveClass('bg-transparent');
      expect(input).not.toHaveClass('border-2');
    });
  });
});
