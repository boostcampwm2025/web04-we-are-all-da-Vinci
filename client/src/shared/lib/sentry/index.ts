import * as Sentry from '@sentry/react';
interface SentryConfig {
  dsn: string;
  environment: string;
  release: string;
}

export const initSentry = (config: SentryConfig) => {
  const { dsn, environment, release } = config;

  if (!dsn) {
    console.warn('Sentry DSN값을 환경변수에서 찾지 못함.');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
      // Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost', import.meta.env.VITE_API_URL],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
  });
};

export const captureException = (
  error: Error,
  context?: Record<string, unknown>,
) => {
  Sentry.captureException(error, context);
};

export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
) => {
  Sentry.captureMessage(message, level);
};

export const captureEvent = (
  message: string,
  level: Sentry.SeverityLevel,
  tags: Record<string, string>,
  extra?: Record<string, unknown>,
) => {
  Sentry.captureEvent({
    message,
    level,
    tags,
    extra,
  });
};

// 로그인 들어가면 넣기? 사용자 정보와 함께 에러 기록 가능

// export const setUser = (user: {
//   id: string;
//   email?: string;
//   username?: string;
// }) => {
//   Sentry.setUser(user);
// };

// export const clearUser = () => {
//   Sentry.setUser(null);
// };
