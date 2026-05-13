const buildShareMessageWithRanking = (
  score: number,
  rank: number,
  tossLink: string,
): string =>
  `제 다빈치 점수는 ${score}점이에요! (랭킹 ${rank}위)\n같이 도전해봐요\n${tossLink}`;

export { buildShareMessageWithRanking };
