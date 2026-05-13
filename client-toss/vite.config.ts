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
  if (mode === "production") {
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
      exclude: ["@toss/shared"],
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
