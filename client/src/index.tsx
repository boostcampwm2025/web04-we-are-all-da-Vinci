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

// if (!import.meta.env.DEV) {
//   initMixpanel({
//     token: import.meta.env.VITE_MIXPANEL_TOKEN,
//   });
// }

initMixpanel({
  token: import.meta.env.VITE_MIXPANEL_TOKEN,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
