# Client-Toss (Apps-in-Toss Mini-App) - CLAUDE.md

> 이 워크스페이스는 기존 드로잉 게임(client/ + server/)과 독립적입니다. 루트 CLAUDE.md는 모노레포 인프라와 Git 워크플로우만 참고하세요.

## Overview

- Apps-in-Toss WebView 미니앱 (Granite framework v2.0.9)
- 비게임 미니앱이므로 **TDS(Toss Design System) 사용 필수** (토스 리뷰 승인 요건)
- **WebSocket/Redis/Socket.io 없음** — 기존 게임과 완전 독립
- `@toss/shared` 패키지로 server-toss와 타입/스키마 공유

## Tech Stack

| 항목       | 값                                                       |
| ---------- | -------------------------------------------------------- |
| Framework  | `@apps-in-toss/web-framework` ^2.0.9 (Granite)           |
| TDS        | `@toss/tds-mobile` ^2.3.0, `@toss/tds-mobile-ait` ^2.3.0 |
| React      | 19.2.3                                                   |
| Routing    | react-router-dom ^7.13                                   |
| State      | Zustand ^5.0.9                                           |
| Validation | Zod ^4.3.6                                               |
| Styling    | Tailwind CSS ^4.1.18 + Emotion                           |
| Build      | Vite ^7.2.4, port 5173                                   |
| Test       | Vitest ^4.0.16 (jsdom) + React Testing Library           |

## Development Commands

```bash
# Development (granite dev via scripts/dev.js — auto-detects local IP for WebView)
pnpm dev

# Build (ait build)
pnpm build

# Run tests
pnpm test

# Test watch mode
pnpm test:watch

# Test with coverage
pnpm test:coverage

# Lint
pnpm lint

# Format
pnpm format
```

## Configuration

### granite.config.ts

- `appName`: "we-are-all-da-vinci"
- `webViewProps.type`: "partner"
- `port`: 5173, `host`: WEBVIEW_HOST 환경변수 또는 "localhost"
- `devCommand`: `vite --host`
- `buildCommand`: `vite build`

### Path Aliases

- `@/*` → `./src/*` (tsconfig.app.json + vite.config.ts)
- `@toss/shared` → `../packages/toss-shared/src` (공유 타입/스키마)

## Architecture (FSD)

Feature-Sliced Design 구조:

```
src/
├── app/              - 라우터 설정 (router.tsx)
├── pages/            - 라우트 페이지
│   └── drawing/
│       ├── ui/       - DrawingPage 컴포넌트 + 테스트
│       └── index.ts  - Public API export
├── widgets/          - 페이지 조합 (위젯)
├── features/         - 사용자 상호작용 로직
├── entities/         - 비즈니스 모델
├── shared/           - 공용 UI, 설정, 유틸리티
├── App.tsx           - TDSMobileAITProvider + BrowserRouter 래핑
├── index.tsx         - React 진입점
├── index.css         - Tailwind CSS + WebView 리셋
└── test/
    └── setup.ts      - Vitest 설정 (@testing-library/jest-dom)
```

**FSD Public API Pattern:**

- 각 레이어는 `index.ts`로 export 캡슐화
- Import: `import { DrawingPage } from '@/pages/drawing'`
- 내부 경로 직접 import 금지

## Code Conventions

- 컴포넌트는 **화살표 함수**로 작성
- **마지막 줄에 export** (default export 또는 named export)

  ```typescript
  const Button = () => {
    return <button>Click</button>;
  };
  export default Button;
  ```

## TDS (Toss Design System) 사용 패턴

- `TDSMobileAITProvider`로 App 최상위를 감싸야 TDS 컴포넌트 동작
- **TDS는 로컬 브라우저에서 동작하지 않음** → 반드시 샌드박스 앱에서 UI 확인
- Import: `import { Button, BottomCTA, CTAButton } from '@toss/tds-mobile'`
- 하단 버튼 2개: `BottomCTA.Double` (`leftButton` + `rightButton` with `CTAButton`)
- Typography: TDS 토큰 사용 권장, 하드코딩 지양

## Routing

- WebView 환경이므로 파일 기반 라우팅 강제 없음 — React Router 사용
- `BrowserRouter` + `Routes` 방식 (`App.tsx`에서 설정)
- 샌드박스 앱은 루트(`/`)로 진입

## Testing

- Vitest with jsdom environment
- React Testing Library (`@testing-library/react`)
- Test file pattern: `*.test.ts(x)`
- `passWithNoTests` enabled
- Coverage: v8 provider with HTML + LCOV reports
- All test descriptions must be in Korean
