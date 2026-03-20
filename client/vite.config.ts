import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'stats.html',
    }),
    tailwindcss(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        assets: './dist/**',
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      telemetry: false,
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
      '@shared/types': path.resolve(__dirname, '../packages/shared/src'),
      '@davinci/similarity': path.resolve(
        __dirname,
        '../packages/similarity/src',
      ),
    },
  },
  optimizeDeps: {
    exclude: ['@shared/types', '@davinci/similarity'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-analytics': ['@sentry/react', 'mixpanel-browser'],
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
  },
});
