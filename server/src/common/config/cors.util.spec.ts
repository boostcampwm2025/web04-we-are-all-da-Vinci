import { isAllowedOrigin, getSocketCorsOrigin } from './cors.util';

describe('CORS Utility', () => {
  const originalEnv = process.env.CORS_ORIGIN;

  beforeEach(() => {
    process.env.CORS_ORIGIN = 'http://localhost:5173,https://example.com';
  });

  afterEach(() => {
    process.env.CORS_ORIGIN = originalEnv;
  });

  describe('isAllowedOrigin', () => {
    it('환경 변수에 설정된 origin을 허용해야 한다', () => {
      expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
      expect(isAllowedOrigin('https://example.com')).toBe(true);
    });

    it('설정되지 않은 origin을 거부해야 한다', () => {
      expect(isAllowedOrigin('https://malicious.com')).toBe(false);
    });

    it('Netlify 프리뷰 URL을 허용해야 한다', () => {
      expect(
        isAllowedOrigin('https://deploy-preview-123--my-site.netlify.app'),
      ).toBe(true);
      expect(
        isAllowedOrigin('https://deploy-preview-1--test-app.netlify.app'),
      ).toBe(true);
    });

    it('잘못된 Netlify URL은 거부해야 한다', () => {
      expect(isAllowedOrigin('https://my-site.netlify.app')).toBe(false);
      expect(
        isAllowedOrigin('https://deploy-preview-abc--my-site.netlify.app'),
      ).toBe(false);
    });

    it('origin이 없으면 허용해야 한다 (서버 간 요청)', () => {
      expect(isAllowedOrigin(undefined)).toBe(true);
    });
  });

  describe('getSocketCorsOrigin', () => {
    it('환경 변수 origin과 Netlify 패턴을 포함해야 한다', () => {
      const origins = getSocketCorsOrigin();
      expect(origins).toContain('http://localhost:5173');
      expect(origins).toContain('https://example.com');
      expect(origins.some((o) => o instanceof RegExp)).toBe(true);
    });
  });
});
