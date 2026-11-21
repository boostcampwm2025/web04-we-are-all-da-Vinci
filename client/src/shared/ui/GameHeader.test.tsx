import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TITLES } from '@/shared/config';
import { GameHeader } from './GameHeader';

describe('GameHeader', () => {
  it('title을 화면 제목(heading)으로 표시한다', () => {
    render(<GameHeader title="그림을 그려주세요!" />);

    expect(
      screen.getByRole('heading', { name: '그림을 그려주세요!' }),
    ).toBeInTheDocument();
  });

  describe('라운드 배지', () => {
    it('round가 있으면 "ROUND n" 배지를 표시한다', () => {
      render(<GameHeader title="기억하세요!" round={3} />);

      expect(screen.getByText('ROUND 3')).toBeInTheDocument();
    });

    it('round가 없으면 배지를 표시하지 않는다', () => {
      render(<GameHeader title="게임방" />);

      expect(screen.queryByText(/ROUND/)).not.toBeInTheDocument();
    });
  });

  describe('부가 요소', () => {
    it('description이 있으면 설명 문구를 표시한다', () => {
      render(
        <GameHeader
          title="게임방"
          description="친구들이 모일 때까지 기다려주세요!"
        />,
      );

      expect(
        screen.getByText('친구들이 모일 때까지 기다려주세요!'),
      ).toBeInTheDocument();
    });

    it('description이 없으면 빈 설명 문단을 렌더링하지 않는다', () => {
      const { container } = render(<GameHeader title="게임방" />);

      expect(container.querySelector('p')).not.toBeInTheDocument();
    });

    it('showLogo를 생략하면 로고(메인 타이틀)를 표시한다', () => {
      render(<GameHeader title="게임방" />);

      expect(
        screen.getByRole('heading', { name: TITLES.MAIN }),
      ).toBeInTheDocument();
    });

    it('showLogo가 false면 로고를 표시하지 않는다', () => {
      render(<GameHeader title="그림을 그려주세요!" showLogo={false} />);

      expect(
        screen.queryByRole('heading', { name: TITLES.MAIN }),
      ).not.toBeInTheDocument();
    });

    it('showDecoration이 true면 제목 아래 밑줄 장식을 표시한다', () => {
      const { container } = render(
        <GameHeader title="최종 결과" showDecoration />,
      );

      expect(container.querySelector('.bg-yellow-300')).toBeInTheDocument();
    });

    it('showDecoration을 생략하면 밑줄 장식을 표시하지 않는다', () => {
      const { container } = render(<GameHeader title="현재 순위" />);

      expect(container.querySelector('.bg-yellow-300')).not.toBeInTheDocument();
    });
  });
});
