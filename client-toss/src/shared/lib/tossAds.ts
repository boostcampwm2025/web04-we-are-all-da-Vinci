import { TossAds } from "@apps-in-toss/web-framework";

let initPromise: Promise<void> | null = null;

export const initTossAdsOnce = (): Promise<void> => {
  initPromise ??= new Promise<void>((resolve, reject) => {
    try {
      TossAds.initialize({
        callbacks: {
          onInitialized: resolve,
          onInitializationFailed: reject,
        },
      });
    } catch {
      // 네이티브 브릿지 미지원 환경 무시
      resolve();
    }
  });
  return initPromise;
};
