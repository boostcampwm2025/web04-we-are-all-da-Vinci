import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Loading from './Loading';
import RoundBadge from './RoundBadge';
import Skeleton from './Skeleton';
import Title from './Title';
import UserAvatar from './UserAvatar';

describe('Title', () => {
  it('title을 h1 제목으로 렌더링한다', () => {
    render(<Title title="우리 모두 다빈치" fontSize="text-5xl" />);

    expect(
      screen.getByRole('heading', { level: 1, name: '우리 모두 다빈치' }),
    ).toBeInTheDocument();
  });

  it('fontSize로 전달한 클래스를 적용한다', () => {
    render(<Title title="우리 모두 다빈치" fontSize="text-7xl" />);

    expect(screen.getByRole('heading')).toHaveClass('text-7xl');
  });
});

describe('RoundBadge', () => {
  it.each([1, 3, 10])('round=%i면 "ROUND {round}" 배지를 표시한다', (round) => {
    render(<RoundBadge round={round} />);

    expect(screen.getByText(`ROUND ${round}`)).toBeInTheDocument();
  });
});

describe('Loading', () => {
  it('로딩 문구를 표시한다', () => {
    render(<Loading />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('pulse 애니메이션이 적용된 자리표시자를 렌더링한다', () => {
    const { container } = render(<Skeleton />);

    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('className으로 크기를 지정할 수 있다', () => {
    const { container } = render(<Skeleton className="h-10 w-32" />);

    expect(container.firstChild).toHaveClass('h-10', 'w-32', 'animate-pulse');
  });
});

describe('UserAvatar', () => {
  // mask id는 렌더링마다 달라지므로 아바타 모양을 결정하는 색상·변형 값만 비교한다
  const avatarSignature = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('rect, path, g'))
      .map((el) => `${el.getAttribute('fill')}|${el.getAttribute('transform')}`)
      .join(',');

  // 같은 profileId는 대기실·채팅·랭킹 어디서 렌더링해도 같은 아바타여야 한다
  it('같은 name이면 어디서 렌더링해도 동일한 아바타를 그린다', () => {
    const { container: first } = render(<UserAvatar name="profile-123" />);
    const { container: second } = render(<UserAvatar name="profile-123" />);

    expect(avatarSignature(first)).toBe(avatarSignature(second));
  });

  it('다른 name이면 다른 아바타를 그린다', () => {
    const { container: first } = render(<UserAvatar name="profile-123" />);
    const { container: second } = render(<UserAvatar name="profile-456" />);

    expect(avatarSignature(first)).not.toBe(avatarSignature(second));
  });

  it('SVG 아바타를 렌더링하고 className을 래퍼에 적용한다', () => {
    const { container } = render(
      <UserAvatar name="profile-123" className="h-8 w-8" />,
    );

    expect(container.firstChild).toHaveClass('h-8', 'w-8');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('size를 생략하면 래퍼 크기를 꽉 채운다(100%)', () => {
    const { container } = render(<UserAvatar name="profile-123" />);

    expect(container.querySelector('svg')).toHaveAttribute('width', '100%');
  });
});
