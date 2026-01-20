import mixpanel from 'mixpanel-browser';

interface MixpanelConfig {
  token: string;
  debug?: boolean;
}

export const initMixpanel = (config: MixpanelConfig) => {
  const { token, debug = false } = config;

  if (!token) {
    console.warn('Mixpanel 토큰을 환경변수에서 찾지 못함.');
    return;
  }

  mixpanel.init(token, {
    debug,
    track_pageview: true,
    persistence: 'localStorage',
  });
};

export const trackEvent = (
  eventName: string,
  properties?: Record<string, unknown>,
) => {
  mixpanel.track(eventName, properties);
};

export const registerUserProperties = (properties: Record<string, unknown>) => {
  mixpanel.register(properties);
};

// 혹시나 회원가입을 만들었을 때 사용할 메서드

// export const identifyUser = (userId: string) => {
//   mixpanel.identify(userId);
// };

// export const setUserProperties = (properties: Record<string, unknown>) => {
//   mixpanel.people.set(properties);
// };

// export const resetUser = () => {
//   mixpanel.reset();
// };
