// @ts-check
/**
 * 공통 UI(shared/ui) 테스트의 실효성을 검증하는 Mutation Testing 설정
 * - 소스 코드에 의도적인 버그(mutant)를 심고, 테스트가 이를 잡아내는지(killed) 확인한다
 * - 실행: pnpm test:mutation
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  testRunner: 'vitest',
  // pnpm 격리 구조에서는 플러그인 자동 탐색이 안 되므로 명시적으로 등록
  plugins: ['@stryker-mutator/vitest-runner'],
  vitest: {
    configFile: 'vitest.config.ts',
    // mutant ↔ 테스트 매핑은 perTest 커버리지가 담당하므로 전체 테스트를 대상으로 한다
    related: false,
  },
  mutate: [
    'src/shared/ui/**/*.tsx',
    'src/shared/model/useModalKeyboard.ts',
    '!src/shared/ui/**/*.test.tsx',
    '!src/shared/ui/**/*.stories.tsx',
    // 테스트 대상이 아닌 순수 장식/캔버스 애니메이션 컴포넌트
    '!src/shared/ui/Doodles.tsx',
    '!src/shared/ui/FireworkCanvas.tsx',
    '!src/shared/ui/PageBackground.tsx',
    '!src/shared/ui/DecorateTitle.tsx',
  ],
  // 샌드박스 복사본에서는 '@' → '/src' 별칭이 원본 src를 가리켜 mutant가 테스트되지 않으므로
  // 원본 파일을 직접 변이시킨다 (실행 종료 시 자동 복구, 실행 중에는 소스 수정 금지)
  inPlace: true,
  coverageAnalysis: 'perTest',
  ignoreStatic: true,
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  // 점수가 90% 아래로 떨어지면 실행을 실패 처리한다 (테스트 실효성 회귀 방지)
  thresholds: { high: 80, low: 60, break: 90 },
  tempDirName: '.stryker-tmp',
  // timeout도 'detected'로 집계되므로, 느린 환경에서의 가짜 timeout이 점수를 부풀리지 않도록 여유를 둔다
  concurrency: 2,
  timeoutMS: 20000,
};
