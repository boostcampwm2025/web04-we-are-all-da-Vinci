import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import svgr from "vite-plugin-svgr";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REQUIRED_PROD_ENV = [
  "VITE_API_BASE_URL",
  "VITE_CONTACTS_VIRAL_MODULE_ID",
] as const;

export default defineConfig(({ mode }) => {
  // CI(번들 사이즈 측정·산출물 검증 용도)에선 운영 env가 없는 게 정상이라 검증 우회한다.
  // 실제 운영 빌드는 로컬/배포 환경에서 진행하며 그땐 CI 변수가 비어 있어 검증이 작동.
  if (mode === "production" && !process.env.CI) {
    const env = loadEnv(mode, process.cwd(), "");
    const missing = REQUIRED_PROD_ENV.filter((key) => !env[key]?.trim());
    if (missing.length > 0) {
      throw new Error(
        `프로덕션 빌드에 필요한 환경변수가 누락됐어요: ${missing.join(", ")}. ` +
          "client-toss/.env.local 또는 빌드 환경에 값을 주입해주세요.",
      );
    }
  }

  return {
    plugins: [svgr(), react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@toss/shared": path.resolve(__dirname, "../packages/toss-shared/src"),
      },
    },
    optimizeDeps: {
      exclude: ["@toss/shared", "@apps-in-toss/web-framework"],
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/],
      },
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom"],
          },
        },
      },
    },
  };
});
