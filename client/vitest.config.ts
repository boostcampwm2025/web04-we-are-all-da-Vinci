import { fileURLToPath } from 'url';
import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': '/src',
      '@shared/types': path.resolve(__dirname, '../packages/shared/src'),
      '@davinci/similarity': path.resolve(
        __dirname,
        '../packages/similarity/src',
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // 테스트가 import하지 않은 파일도 측정 대상에 포함 (테스트 없는 새 파일을 0%로 잡기 위함)
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.stories.tsx',
        '**/*.d.ts',
        'src/test/**',
        // re-export만 하는 배럴 파일
        'src/shared/ui/index.ts',
        // jsdom에는 canvas 렌더링이 없어 단위 테스트 대상에서 제외
        'src/shared/ui/FireworkCanvas.tsx',
      ],
      thresholds: {
        // 합산이 아닌 파일 단위로 검사해, 테스트 없는 컴포넌트 추가를 막는다
        // (Vitest는 perFile을 최상위에서만 읽음. 전역 기준값이 없어 아래 glob에만 적용된다)
        perFile: true,
        // 공통 UI는 모든 페이지가 공유하므로 기준 미달 시 CI(test:coverage)를 실패시킨다
        'src/shared/ui/**': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
});
