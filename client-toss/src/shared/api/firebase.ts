import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

let analyticsInstance: Analytics | null = null;

export const initFirebaseAnalyticsOnce = async (): Promise<void> => {
  if (analyticsInstance) return;

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) return;

  if (!(await isSupported())) return;

  const app = initializeApp({
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  });

  analyticsInstance = getAnalytics(app);
};

export const getAnalyticsInstance = (): Analytics | null => analyticsInstance;
