import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import App from '@/app';
import { initSentry } from '@/shared/lib/sentry';
import { initMixpanel } from '@/shared/lib/mixpanel';
import { initEarlyExitTracking } from '@/shared/lib/mixpanel/earlyExitTracking';

initSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
  release: import.meta.env.VITE_SENTRY_RELEASE,
});

if (!import.meta.env.DEV) {
  initMixpanel({
    token: import.meta.env.VITE_MIXPANEL_TOKEN,
  });
  // Mixpanel 초기화 직후, React 렌더링 전에 이탈 감지 시작
  initEarlyExitTracking();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
