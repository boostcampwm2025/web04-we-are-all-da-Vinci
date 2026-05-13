const buildShareMessageWithRanking = (
  score: number,
  rank: number,
  tossLink: string,
): string =>
  `제 점수는 ${score}점이에요! (랭킹 ${rank}위) \n같이 도전해봐요!\n${tossLink}
  \n기억하고 그려서 두뇌를 깨우는 앱 \n우리모두 다빈치`;

export { buildShareMessageWithRanking };
