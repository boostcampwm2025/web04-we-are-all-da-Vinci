import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "we-are-all-da-vinci",
  brand: {
    displayName: "우리 모두 다빈치",
    primaryColor: "#0166FE",
    icon: "https://static.toss.im/appsintoss/23215/f7b34a41-2e40-405f-8323-35f7208b7998.png",
  },
  web: {
    host: process.env.WEBVIEW_HOST ?? "localhost",
    port: 5173,
    commands: {
      dev: "vite --host",
      build: "vite build",
    },
  },
  permissions: [],
  webViewProps: {
    // 비게임 미니앱 내비게이션 바 (게임: "game", 비게임: "partner")
    type: "partner",
    // iOS: 스크롤 끝에서 바운스 효과 — 캔버스 드로잉 중 튕김 방지 (뷰별로 조정 가능)
    bounces: false,
    // iOS: 당겨서 새로고침 — 그림 그리다가 새로고침되는 것 방지 (뷰별로 조정 가능)
    pullToRefreshEnabled: false,
    // iOS: 좌우 스와이프 뒤로가기/앞으로가기 — 캔버스 스와이프 시 페이지 이동 방지 (뷰별로 조정 가능)
    allowsBackForwardNavigationGestures: false,
  },
});
