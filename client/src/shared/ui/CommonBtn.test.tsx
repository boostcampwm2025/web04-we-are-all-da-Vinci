import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CommonBtn from './CommonBtn';

type Variant = 'scribble' | 'radius';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('CommonBtn', () => {
  // 대기실(radius), 메인/결과 화면(scribble) 등 어느 variant로 쓰든 동일하게 동작해야 한다
  describe.each<Variant>(['scribble', 'radius'])(
    '%s variant 공통 동작',
    (variant) => {
      it('클릭하면 onClick이 한 번 호출된다', () => {
        const onClick = vi.fn();
        renderWithRouter(
          <CommonBtn variant={variant} text="시작" onClick={onClick} />,
        );

        fireEvent.click(screen.getByRole('button', { name: '시작' }));

        expect(onClick).toHaveBeenCalledTimes(1);
      });

      it('disabled면 클릭해도 onClick이 호출되지 않는다', () => {
        const onClick = vi.fn();
        renderWithRouter(
          <CommonBtn
            variant={variant}
            text="시작"
            onClick={onClick}
            disabled
          />,
        );

        const button = screen.getByRole('button', { name: '시작' });
        fireEvent.click(button);

        expect(button).toBeDisabled();
        expect(onClick).not.toHaveBeenCalled();
      });

      it('disabled면 비활성 스타일(opacity-50, cursor-not-allowed)이 적용된다', () => {
        renderWithRouter(<CommonBtn variant={variant} text="시작" disabled />);

        const button = screen.getByRole('button', { name: '시작' });

        expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
      });

      it('활성 상태에서는 cursor-pointer가 적용된다', () => {
        renderWithRouter(<CommonBtn variant={variant} text="시작" />);

        expect(screen.getByRole('button', { name: '시작' })).toHaveClass(
          'cursor-pointer',
        );
      });
    },
  );

  describe('path 없는 버튼', () => {
    const LocationKey = () => (
      <span data-testid="location">{useLocation().key}</span>
    );

    it('path가 없으면 클릭해도 페이지 이동(history push)이 일어나지 않는다', () => {
      render(
        <MemoryRouter>
          <CommonBtn variant="radius" text="확인" onClick={vi.fn()} />
          <LocationKey />
        </MemoryRouter>,
      );
      const before = screen.getByTestId('location').textContent;

      fireEvent.click(screen.getByRole('button', { name: '확인' }));

      expect(screen.getByTestId('location').textContent).toBe(before);
    });
  });

  describe('아이콘 · 텍스트 렌더링', () => {
    it('icon이 있으면 아이콘을 렌더링하고, 텍스트와 함께면 간격(mr-1)을 둔다', () => {
      renderWithRouter(
        <CommonBtn variant="scribble" icon="add_circle" text="방 만들기" />,
      );

      const icon = screen.getByText('add_circle');

      expect(icon).toHaveClass('material-symbols-outlined', 'mr-1');
    });

    it('icon이 없으면 아이콘 요소를 렌더링하지 않는다', () => {
      const { container } = renderWithRouter(
        <CommonBtn variant="scribble" text="방 만들기" />,
      );

      expect(
        container.querySelector('.material-symbols-outlined'),
      ).not.toBeInTheDocument();
    });

    it('아이콘만 있는 버튼은 간격(mr-1)과 좌우 여백(px-0) 없이 렌더링한다', () => {
      renderWithRouter(
        <CommonBtn variant="radius" icon="settings" ariaLabel="설정" />,
      );

      expect(screen.getByText('settings')).not.toHaveClass('mr-1');
      expect(screen.getByRole('button', { name: '설정' })).toHaveClass('px-0');
    });

    it('텍스트가 있는 radius 버튼은 좌우 여백을 없애지 않는다', () => {
      renderWithRouter(<CommonBtn variant="radius" text="시작" />);

      expect(screen.getByRole('button', { name: '시작' })).not.toHaveClass(
        'px-0',
      );
    });

    it('text가 없으면 빈 텍스트 요소를 렌더링하지 않는다', () => {
      renderWithRouter(
        <CommonBtn variant="radius" icon="settings" ariaLabel="설정" />,
      );

      expect(
        screen.getByRole('button', { name: '설정' }).children,
      ).toHaveLength(1);
    });

    it.each([
      ['sm', 'text-lg'],
      ['md', 'text-2xl'],
      ['lg', 'text-3xl'],
    ] as const)(
      'scribble size="%s"면 아이콘을 %s 크기로 렌더링한다',
      (size, cls) => {
        renderWithRouter(
          <CommonBtn
            variant="scribble"
            size={size}
            icon="replay"
            text="다시하기"
          />,
        );

        expect(screen.getByText('replay')).toHaveClass(cls);
      },
    );

    it.each([
      ['sm', 'text-lg'],
      ['md', 'text-xl'],
      ['lg', 'text-2xl'],
    ] as const)(
      'radius size="%s"면 아이콘을 %s 크기로 렌더링한다',
      (size, cls) => {
        renderWithRouter(
          <CommonBtn
            variant="radius"
            size={size}
            icon="logout"
            text="나가기"
          />,
        );

        expect(screen.getByText('logout')).toHaveClass(cls);
      },
    );

    it.each([
      ['sm', 'text-lg'],
      ['md', 'text-xl'],
      ['lg', 'text-3xl'],
    ] as const)(
      'scribble size="%s"면 텍스트를 %s 굵은 손글씨로 렌더링한다',
      (size, cls) => {
        renderWithRouter(
          <CommonBtn variant="scribble" size={size} text="다시하기" />,
        );

        expect(screen.getByText('다시하기')).toHaveClass(
          'font-handwriting',
          'font-bold',
          cls,
        );
      },
    );
  });

  describe('페이지 이동 (path)', () => {
    const renderWithRoutes = (
      props: Partial<Parameters<typeof CommonBtn>[0]>,
    ) =>
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route
              path="/"
              element={
                <CommonBtn
                  variant="radius"
                  text="나가기"
                  path="/home"
                  {...props}
                />
              }
            />
            <Route path="/home" element={<div>홈 화면</div>} />
          </Routes>
        </MemoryRouter>,
      );

    it('path가 있으면 클릭 시 해당 경로로 이동한다', () => {
      renderWithRoutes({});

      fireEvent.click(screen.getByRole('button', { name: '나가기' }));

      expect(screen.getByText('홈 화면')).toBeInTheDocument();
    });

    it('onClick과 path가 함께 있으면 onClick 호출 후 이동한다', () => {
      const onClick = vi.fn();
      renderWithRoutes({ onClick });

      fireEvent.click(screen.getByRole('button', { name: '나가기' }));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(screen.getByText('홈 화면')).toBeInTheDocument();
    });

    it('disabled면 path가 있어도 이동하지 않는다', () => {
      renderWithRoutes({ disabled: true });

      fireEvent.click(screen.getByRole('button', { name: '나가기' }));

      expect(screen.queryByText('홈 화면')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: '나가기' }),
      ).toBeInTheDocument();
    });
  });

  describe('접근성', () => {
    it('ariaLabel이 없으면 text를 접근 가능한 이름으로 사용한다', () => {
      renderWithRouter(<CommonBtn variant="radius" text="방 만들기" />);

      expect(
        screen.getByRole('button', { name: '방 만들기' }),
      ).toBeInTheDocument();
    });

    it('아이콘 전용 버튼은 ariaLabel로 접근 가능한 이름을 가진다', () => {
      renderWithRouter(
        <CommonBtn variant="radius" icon="settings" ariaLabel="게임 설정" />,
      );

      expect(
        screen.getByRole('button', { name: '게임 설정' }),
      ).toBeInTheDocument();
    });
  });

  describe('스타일 props', () => {
    it.each([
      ['blue', 'border-blue-400', 'text-blue-600'],
      ['indigo', 'border-indigo-400', 'text-indigo-600'],
      ['red', 'border-red-400', 'text-red-600'],
      ['green', 'border-green-400', 'text-green-600'],
      ['gray', 'border-gray-400', 'text-gray-600'],
    ])(
      'radius variant의 color="%s"는 %s, %s 클래스를 적용한다',
      (color, border, text) => {
        renderWithRouter(
          <CommonBtn variant="radius" text="버튼" color={color} />,
        );

        expect(screen.getByRole('button')).toHaveClass(border, text);
      },
    );

    it('color를 생략하면 blue가 기본값이다', () => {
      renderWithRouter(<CommonBtn variant="radius" text="버튼" />);

      expect(screen.getByRole('button')).toHaveClass(
        'border-blue-400',
        'text-blue-600',
      );
    });

    it('정의되지 않은 color는 blue로 대체된다', () => {
      renderWithRouter(<CommonBtn variant="radius" text="버튼" color="pink" />);

      expect(screen.getByRole('button')).toHaveClass(
        'border-blue-400',
        'text-blue-600',
      );
    });

    it.each([
      ['sm', 'h-full'],
      ['md', 'h-12'],
      ['lg', 'h-16'],
    ] as const)('size="%s"는 %s 높이를 적용한다', (size, heightClass) => {
      renderWithRouter(<CommonBtn variant="radius" text="버튼" size={size} />);

      expect(screen.getByRole('button')).toHaveClass(heightClass);
    });

    it('size를 생략하면 lg(h-16)가 기본값이다', () => {
      renderWithRouter(<CommonBtn variant="scribble" text="버튼" />);

      expect(screen.getByRole('button')).toHaveClass('h-16');
    });

    it('scribble variant는 손그림 테두리(scribble-border)를 가진다', () => {
      renderWithRouter(<CommonBtn variant="scribble" text="버튼" />);

      expect(screen.getByRole('button')).toHaveClass('scribble-border');
    });

    it('className으로 기본 너비(w-full)를 덮어쓸 수 있다', () => {
      renderWithRouter(
        <CommonBtn
          variant="radius"
          icon="settings"
          ariaLabel="설정"
          className="w-12"
        />,
      );

      const button = screen.getByRole('button', { name: '설정' });

      expect(button).toHaveClass('w-12');
      expect(button).not.toHaveClass('w-full');
    });
  });
});
