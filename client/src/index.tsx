import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import App from '@/app';
import { initSentry } from '@/shared/lib/sentry';
import { initMixpanel } from '@/shared/lib/mixpanel';

initSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
  release: import.meta.env.VITE_SENTRY_RELEASE,
});

initMixpanel({
  token: import.meta.env.VITE_MIXPANEL_TOKEN,
  debug: import.meta.env.DEV,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
