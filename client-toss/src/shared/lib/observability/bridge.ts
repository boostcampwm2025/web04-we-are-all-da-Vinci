/**
 * 토스 앱 밖(일반 브라우저 등)에서 열리면 ReactNativeWebView 브리지가 없어
 * appLogin 등 모든 SDK 호출이 실패한다. 이 상태를 다른 실패와 구분해 계측하기 위한 판별.
 */
export const isTossBridgeAvailable = (): boolean =>
  typeof window !== "undefined" && "ReactNativeWebView" in window;
