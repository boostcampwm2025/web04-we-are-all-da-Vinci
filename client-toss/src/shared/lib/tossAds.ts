import { TossAds } from "@apps-in-toss/web-framework";

let initPromise: Promise<void> | null = null;

const initTossAdsOnce = (): Promise<void> => {
  initPromise ??= new Promise<void>((resolve, reject) => {
    if (!TossAds.initialize.isSupported()) {
      reject(new Error("TossAds not supported"));
      return;
    }

    TossAds.initialize({
      callbacks: {
        onInitialized: resolve,
        onInitializationFailed: reject,
      },
    });
  });
  return initPromise;
};

export { initTossAdsOnce };
