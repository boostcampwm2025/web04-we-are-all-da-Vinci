export const getRankMessage = (rank: number): string => {
  if (rank === -1) return '';
  if (rank === 1) return `현재 ${rank}등이에요! 이 기세를 유지하세요! 👑`;
  if (rank <= 3) return `현재 ${rank}등이에요! 1등이 코앞이에요! 🔥`;
  return `현재 ${rank}등이에요! 조금만 더 노력해서 1등 해봐요! 👊`;
};
