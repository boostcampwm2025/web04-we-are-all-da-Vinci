# Client-Toss (Apps-in-Toss Mini-App) - CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 이 워크스페이스는 기존 드로잉 게임(client/ + server/)과 독립적입니다. 루트 CLAUDE.md는 모노레포 인프라와 Git 워크플로우만 참고하세요.

## Overview

- Apps-in-Toss WebView 미니앱 (Granite framework v2.0.9)
- 비게임 미니앱이므로 **TDS(Toss Design System) 사용 필수** (토스 리뷰 승인 요건)
- **WebSocket/Redis/Socket.io 없음** — 기존 게임과 완전 독립. server-toss와는 REST API로만 통신
- `@toss/shared` 패키지로 server-toss와 타입/Zod 스키마 공유

## Tech Stack

| 항목       | 값                                                       |
| ---------- | -------------------------------------------------------- |
| Framework  | `@apps-in-toss/web-framework` ^2.0.9 (Granite)           |
| TDS        | `@toss/tds-mobile` ^2.3.0, `@toss/tds-mobile-ait` ^2.3.0 |
| React      | 19.2.3                                                   |
| Routing    | react-router-dom ^7.13                                   |
| State      | useState/useEffect 기반                                  |
| Validation | Zod ^4.3.6                                               |
| Styling    | Tailwind CSS ^4.1.18 + Emotion                           |
| Build      | Vite ^7.2.4, port 5173                                   |
| Test       | Vitest ^4.0.16 (jsdom) + React Testing Library           |

## Development Commands

```bash
# Development (granite dev via scripts/dev.js — 로컬 IP 자동 감지 후 WEBVIEW_HOST 주입)
pnpm dev

# Build (ait build — 결과물: we-are-all-da-vinci.ait)
pnpm build

# 단일 테스트 파일 실행
pnpm test src/feature/drawing/model/useDrawingStrokes.test.ts

# 모든 테스트 (CI와 동일)
pnpm test

# Watch 모드
pnpm test:watch

# 커버리지 (v8 provider, HTML + LCOV)
pnpm test:coverage

# Lint / Format
pnpm lint
pnpm format
pnpm format:check

# QA: 앱인토스 심사 기준 자동 검증 (CI 모드는 WARN도 실패 처리)
pnpm qa
pnpm qa:ci
```

## Configuration

### granite.config.ts

- `appName`: "we-are-all-da-vinci"
- `webViewProps.type`: "partner" (비게임), `bounces: false`, `pullToRefreshEnabled: false`, `allowsBackForwardNavigationGestures: false` — 캔버스 드로잉 보호용 기본값. 뷰별로 필요 시 재설정 가능
- `port`: 5173, `host`: WEBVIEW_HOST 환경변수 또는 "localhost" (dev.js가 자동 주입)

### Path Aliases (vite.config.ts + tsconfig.app.json + vitest.config.ts에 모두 동기화)

- `@/*` → `./src/*`
- `@toss/shared` → `../packages/toss-shared/src` (공유 타입/Zod 스키마)

### Vite Dev Proxy

- `/api` → `http://localhost:3000` (rewrite로 `/api` prefix 제거). 로컬 개발 시 server-toss를 3000번 포트에서 실행 중이라고 가정

## Architecture (FSD)

Feature-Sliced Design 구조:

```text
src/
├── app/config/         - router.tsx, vitest.setup.ts
├── views/              - 라우트 뷰 페이지
│   ├── dashboard/      - 홈("/") — 일일 1회 자동 진입 + "한번 더 그리기" 버튼
│   ├── login/          - 로그인 화면
│   ├── memorize/       - 그림 보고 기억하기
│   ├── drawing/        - 캔버스에 그리기
│   ├── submitted/      - 제출 완료 화면
│   ├── ranking/        - TOP 100 랭킹
│   ├── rankingDetail/  - 개별 그림 상세 ("/drawing/:drawingId")
│   └── status/         - 상태 화면
├── feature/            - 사용자 상호작용 로직
│   ├── drawing/        - 캔버스/툴바, 스트로크 모델, 채점 훅
│   └── login/          - 토스 OAuth 로그인 훅
├── entities/           - 비즈니스 모델 (UI + 도메인 훅)
│   ├── myScoreCard/    - 내 그림 카드 + useMyDrawings
│   ├── podium/         - 랭킹 TOP3 시상대
│   ├── ranking/        - 랭킹 리스트 항목
│   ├── scoreDetailCard - 점수 상세
│   └── phaseHeader/    - 단계 헤더
├── shared/
│   ├── api/            - serverTossApi (토큰 재발급 포함 fetch 클라이언트)
│   ├── hooks/          - useAbortableQuery
│   ├── lib/            - useCountdown, useExitGuard, useRequiredState, tossAds
│   ├── ui/             - 공용 UI (BannerAd, score 등)
│   └── assets/         - 이미지, 아이콘
├── App.tsx             - TDSMobileAITProvider + RouterProvider 래핑 + initTossAdsOnce
├── index.tsx           - React 진입점
└── index.css           - Tailwind CSS + WebView 리셋 + 글로벌 레이아웃
```

**FSD Public API Pattern (필수, ESLint `no-restricted-imports`로 강제):**

- 각 레이어는 `index.ts`로 export 캡슐화. 새 모듈 생성 시 반드시 해당 슬라이스의 `index.ts`에 export 추가
- shared/lib: `@/shared/lib` ✓, `@/shared/lib/useCountdown` ✗ (단일 진입점)
- shared/ui, shared/assets: 세그먼트 단위 — `@/shared/ui/score` ✓, `@/shared/ui/score/Score` ✗
- feature/entities/views: 슬라이스 단위 — `@/feature/drawing` ✓, `@/feature/drawing/ui/Toolbar` ✗

## API Layer (shared/api/serverToss.ts)

- 모든 요청은 `request<T>()` 헬퍼 경유. `localStorage.access_token`을 `Authorization: Bearer`로 자동 주입
- **401 자동 토큰 재발급**: 401 응답 시 `appLogin()` → `/oauth/toss/login`으로 재발급 → 원 요청 1회 재시도. `reissuePromise` 싱글톤으로 동시 401 합치기 (무한 루프 방지를 위해 로그인 엔드포인트 자체는 재시도 제외)
- 모든 응답은 `@toss/shared`의 Zod 스키마로 파싱 (`LoginResponseSchema`, `PromptResponseSchema`, `SimilarityResponseSchema`, 등)
- 에러 메시지는 해요체 ("요청 실패", "토큰 재발급 응답이 올바르지 않아요")

## 게임 플레이 모델 (DashboardView)

- 일일 1회 강제: `getDeviceId()`로 익명 해시 획득 → `localStorage.lastPlayed_${hash}`가 오늘 날짜면 대시보드만 표시, 아니면 `getPrompt()` 호출 후 `/memorize`로 자동 navigate (`replace: true`)
- `getDeviceId()` 실패 시 hash="local"로 폴백
- "한번 더 그리기" 버튼으로 수동 재진입 가능

## Code Conventions

- 컴포넌트는 **화살표 함수**로 작성, **마지막 줄에 export** (default 또는 named)
- FSD 슬라이스 폴더명은 **camelCase** (e.g., `phaseHeader`, `myScoreCard`)
- **Tailwind CSS v4 문법 필수** (v3 문법 금지)
  - CSS 변수: `text-(--color-grey)` ✓, `text-[var(--color-grey)]` ✗
  - important: `rounded-full!` ✓, `!rounded-full` ✗
- 모든 사용자 노출 문구는 **해요체** (앱인토스 심사 요건)
- **상수·도메인 타입은 사용처 파일에 인라인하지 말고 슬라이스의 `config/`로 분리** (가독성)
  - 시간/임계값 등 동작 튜닝 매직 넘버, 슬라이스 외부와 공유하는 도메인 타입이 대상
  - 예: `feature/drawing/config/scoring.ts` (`SCORE_DEBOUNCE_MS`, `TREND_THRESHOLD`, `ScoreTrend`)
  - 단일 함수 내부에서만 쓰이는 임시 상수는 그대로 둬도 됨

## TDS (Toss Design System) 사용 패턴

- `TDSMobileAITProvider`로 App 최상위를 감싸야 TDS 컴포넌트 동작
- **TDS는 로컬 브라우저에서 동작하지 않음** → 반드시 토스 샌드박스 앱에서 UI 확인
- Import: `import { Button, BottomCTA, CTAButton, Top } from '@toss/tds-mobile'`
- 하단 버튼 2개: `BottomCTA.Double` (`leftButton` + `rightButton` with `CTAButton`)
- Typography: `Top.TitleParagraph`, `Top.SubtitleParagraph`, `Paragraph.Text` 등 TDS 토큰 사용

## 앱인토스 SDK 활용

- `useExitGuard` (shared/lib): Android 하드웨어 뒤로가기를 가로채서 다이얼로그 표시. iOS 스와이프 제스처도 동시 비활성화
- `initTossAdsOnce` (shared/lib): App.tsx에서 1회 초기화. `<BannerAd>` 컴포넌트로 노출
- 캔버스 화면에서는 `bounces`, `pullToRefreshEnabled`, `allowsBackForwardNavigationGestures` 모두 false (granite.config.ts 기본값)

## Global Layout (index.css)

- `#root`에 `flex column` + `height: 100%` + `padding-bottom: env(safe-area-inset-bottom)` 적용. 별도 Layout 컴포넌트 없음
- CSS 변수: `--page-px: 20px` (좌우 패딩), `--card-mx: 12px`, 색상 토큰 (`--color-toss-blue`, `--color-grey`, `--color-gold` 등)
- 각 페이지에서 `px-(--page-px)`로 좌우 패딩 적용

## Routing (app/config/router.tsx)

- `createBrowserRouter` 기반. 샌드박스 앱은 루트(`/`) → `DashboardView`로 진입
- 라우트: `/login`, `/`, `/memorize`, `/drawing`, `/drawing/:drawingId` (rankingDetail), `/submitted`, `/ranking`

## Testing

- Vitest with jsdom, `globals: true`, setup: `src/app/config/vitest.setup.ts`
- 테스트 파일 패턴: `src/**/*.{test,spec}.{ts,tsx}`, `passWithNoTests` 활성화
- **vitest.setup.ts에서 외부 의존성을 모두 모킹**:
  - `@toss/tds-mobile` 컴포넌트 전체 (Top, Button, BottomCTA, CTAButton, ConfirmDialog, Paragraph, ProgressBar 등)
  - `@toss/tds-mobile-ait`의 TDSMobileAITProvider
  - `@apps-in-toss/web-framework`의 모든 export (appLogin, getDeviceId, graniteEvent, TossAds 등)
  - `HTMLCanvasElement.prototype.getContext`와 `ResizeObserver` 폴리필
- 모든 테스트 description은 한국어 (e.g., `describe('카운트다운', () => ...)`)

## QA (scripts/qa.ts)

`pnpm qa` 실행 시 다음 8개 자동 검증:

1. **tooling** — 의존성/스크립트 검증
2. **granite-config** — granite.config.ts 필수 필드
3. **tds-usage** — TDS 컴포넌트 사용 여부
4. **ux-writing** — 문구 검사 (해요체, 다크패턴 단어 등)
5. **dark-pattern** — UI 다크패턴 패턴 검출
6. **ad-integration** — 광고 SDK 통합 검증
7. **external-links** — 외부 링크 노출 검사
8. **bundle-size** — `dist/` 번들 크기

수동 QA(실기기)는 `QA_CHECKLIST.md` 참고.

## CI

PR에서 `client-toss/**` 또는 `packages/**` 변경 시 자동 실행 (루트 ci.yml):

1. `pnpm lint`
2. `pnpm format:check`
3. `pnpm test:coverage`
4. `pnpm qa:ci` (CI 모드는 WARN도 실패)
5. `pnpm build`
