export interface RankStyles {
  bg: string;
  border: string;
  badge: string;
  text: string;
}

/**
 * 순위에 따른 스타일 반환
 * 1등: 금색, 2등: 은색, 3등: 동색, 그 외: 기본
 */
export const getRankStyles = (rank: number): RankStyles => {
  if (rank === 1) {
    return {
      bg: 'bg-surface-warm',
      border: 'border-rank-gold',
      badge: 'bg-rank-gold text-white',
      text: 'text-rank-gold-text',
    };
  }
  if (rank === 2) {
    return {
      bg: 'bg-surface-muted',
      border: 'border-rank-silver',
      badge: 'bg-rank-silver text-white',
      text: 'text-rank-silver-text',
    };
  }
  if (rank === 3) {
    return {
      bg: 'bg-surface-warm',
      border: 'border-rank-bronze',
      badge: 'bg-rank-bronze text-white',
      text: 'text-rank-bronze-text',
    };
  }
  return {
    bg: 'bg-white',
    border: 'border-gray-200',
    badge: 'bg-gray-300 text-gray-700',
    text: '',
  };
};
