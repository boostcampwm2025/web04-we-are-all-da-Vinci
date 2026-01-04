import * as Sentry from '@sentry/react';
interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
}

export function initSentry(config: SentryConfig) {
  const { dsn, environment, release, tracesSampleRate = 1.0 } = config;

  if (!dsn) {
    console.warn(
      'Sentry DSN is not configured. Skipping Sentry initialization.',
    );
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
    ],
    tracesSampleRate,
    tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

export function captureException(
  error: Error,
  context?: Record<string, unknown>,
) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
) {
  Sentry.captureMessage(message, level);
}

export function setUser(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  Sentry.setUser(user);
}

export function clearUser() {
  Sentry.setUser(null);
}
