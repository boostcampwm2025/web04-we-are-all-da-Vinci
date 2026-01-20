const OG_CONFIG = {
  default: {
    title: '우리 모두 다빈치',
    description:
      '그림을 기억하고 따라 그려보세요! 가장 유사하게 그린 사람이 이기는 실시간 드로잉 게임',
  },
  game: {
    title: '우리 모두 다빈치 - 게임 참가',
    description: '친구가 기다리고 있어요! 지금 참가하세요',
  },
};

const CRAWLERS =
  /kakaotalk|facebookexternalhit|twitterbot|linkedinbot|discordbot|slackbot/i;

export default async (request: Request, context: { next: () => Promise<Response> }) => {
  const userAgent = request.headers.get('user-agent') || '';

  // 크롤러가 아니면 그냥 통과
  if (!CRAWLERS.test(userAgent)) {
    return context.next();
  }

  const url = new URL(request.url);
  const isGamePage = url.pathname.startsWith('/game/');
  const config = isGamePage ? OG_CONFIG.game : OG_CONFIG.default;
  const baseUrl = 'https://we-are-all-davinci.netlify.app';

  const html = `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>${config.title}</title>
    <meta property="og:url" content="${baseUrl}${url.pathname}" />
    <meta property="og:title" content="${config.title}" />
    <meta property="og:description" content="${config.description}" />
    <meta property="og:image" content="${baseUrl}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${config.title}" />
    <meta name="twitter:description" content="${config.description}" />
    <meta name="twitter:image" content="${baseUrl}/og-image.png" />
  </head>
  <body></body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};

export const config = {
  path: ['/', '/game/*'],
};
