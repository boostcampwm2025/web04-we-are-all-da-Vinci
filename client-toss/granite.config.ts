import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "we-are-all-da-vinci",
  brand: {
    displayName: "우리 모두 다빈치",
    primaryColor: "#0166FE",
    icon: "",
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
    type: "partner",
  },
});
