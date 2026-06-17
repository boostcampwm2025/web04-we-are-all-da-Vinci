# Client-Toss (Apps-in-Toss Mini-App)

Apps-in-Toss WebView 미니앱 — 그림을 기억해서 따라 그리는 **비게임** 미니앱. 기존 드로잉 게임(`client/` + `server/`)과 **완전히 독립**이다 (WebSocket/Redis/Socket.io 없음). 백엔드는 `server-toss`와 REST API로만 통신하고, `@toss/shared` 패키지로 타입·Zod 스키마를 공유한다. 루트 CLAUDE.md는 모노레포 인프라·Git 워크플로우만 참고.

스택: Granite framework v2.x (`@apps-in-toss/web-framework`), React 19, react-router-dom v7, TDS(`@toss/tds-mobile`, `@toss/tds-mobile-ait`), Zod, Tailwind CSS v4 + Emotion, Vite(port 5173), Vitest(jsdom). 정확한 버전은 `package.json`이 권위.

## 반드시 지킬 규칙 (위반 잦음 — 작업 전 확인)

- **일반 브라우저로 동작·성능을 확인하지 말 것.** `pnpm dev`를 크롬 등 일반 브라우저로 열면 로그인부터 실패해 앱이 진행되지 않는다 → "로컬 검증·테스트" 절 참조.
- **모든 사용자 노출 문구는 해요체.** 앱인토스 심사 요건. `pnpm qa`의 ux-writing 검사로 강제.
- **Tailwind CSS는 v4 문법만, v3 금지.**
  - CSS 변수: `text-(--color-grey)` ✓ / `text-[var(--color-grey)]` ✗
  - important: `rounded-full!` ✓ / `!rounded-full` ✗
- **FSD Public API import만.** 슬라이스 내부 경로 직접 import 금지 (ESLint `no-restricted-imports`로 강제) → "아키텍처" 절 참조.
- **새 모듈 생성 시 해당 슬라이스의 `index.ts`에 export 추가.** 누락 시 다른 레이어에서 import 불가.
- **비게임 미니앱이므로 TDS(Toss Design System) 사용 필수.** 토스 리뷰 승인 요건.

## 로컬 검증·테스트 — 일반 브라우저 금지, 샌드박스 필수

### `pnpm dev` 서버는 일반 브라우저용이 아니다

`scripts/dev.js`가 Mac의 LAN IP를 감지해 `WEBVIEW_HOST`로 주입한다. 이는 **같은 WiFi에 연결된 토스 샌드박스 앱이 이 dev 서버에 접속하기 위한 것**이다. 일반 브라우저로 `localhost:5173`을 여는 용도가 아니다.

### 일반 브라우저로 열면 안 되는 이유

`appLogin` 등 SDK가 `ReactNativeWebView` 브리지를 호출하는데 일반 브라우저에는 이 브리지가 없다. **로그인 단계에서 바로 실패하고 앱은 로그인 화면 이후로 진행되지 않는다.** 따라서:

- 라우트·뷰·API 호출·렌더가 아예 실행되지 않는다 → **Network 탭, Performance 탭, Lighthouse 등 어떤 측정도 무의미하다.**
- "SDK 일부 호출이 실패"하는 수준이 아니라 "앱이 동작하지 않는" 것이다. 일반 브라우저 결과로는 동작도 성능도 결론 내리지 말 것.
- 콘솔의 `ReactNativeWebView is not available` / `is not a constant handler` 에러가 이 상태의 증거다.

브리지에 의존하는 SDK: `@apps-in-toss/web-framework`(`appLogin`, `getDeviceId`, `getSafeAreaInsets`, `share`, `getTossShareLink`, `partner.addAccessoryButton`, `tdsEvent`, `TossAds.*`, `Analytics.*`), `@toss/tds-mobile-ait`(`TDSMobileAITProvider` 내부 init).

### 올바른 로컬 검증 절차

1. `pnpm dev` 실행 → 콘솔에 출력된 `host: <LAN IP>` 확인.
2. Mac과 iPhone을 **같은 WiFi**에 연결.
3. 토스 샌드박스 앱(개발자 로그인) → 앱 선택 → 스킴 입력: `intoss://we-are-all-da-vinci`.
4. 빌드 결과물(`.ait`) 검증이 필요하면: `pnpm build` → 토스 콘솔 업로드 → 발급된 QR로 실제 토스앱에서 테스트. (콘솔 QR은 실제 토스앱용 경로 — 로컬 dev 서버는 위 스킴으로 접속)

### 동작·성능 측정·디버깅

측정은 **샌드박스에 연결된 실제 WebView**에서만 의미가 있다.

- **iOS (iPhone 샌드박스):** Mac Safari → 개발자 메뉴 → iPhone의 해당 WebView → Web Inspector(Network/Timelines 패널).
- **Android:** Android Studio 에뮬레이터 + 앱인토스 Android 샌드박스 APK 설치 → Chrome `chrome://inspect`로 WebView 원격 디버깅. 실물 Android 기기 없이 가능. 단 에뮬레이터의 절대 수치(로딩 시간 등)는 실기기를 대표하지 못하므로 변경 전후 상대 비교용으로만 쓸 것.

### 검증 결론 규칙

- **단위 로직**(순수 함수, hooks의 데이터 변환): vitest로 검증 OK. `vitest.setup.ts`에서 SDK가 모두 mock되어 있음.
- **UI·통합·SDK 동작·성능**: 위 샌드박스 절차로만 검증.
- 사용자가 명시적으로 로컬 브라우저 검증을 요청하지 않는 한, 일반 브라우저로 띄우는 단계 자체를 제안하지 말 것.

## 명령어

```bash
pnpm dev            # granite dev (scripts/dev.js — LAN IP를 WEBVIEW_HOST로 주입, 샌드박스 접속용)
pnpm build          # ait build → we-are-all-da-vinci.ait
pnpm test           # 전체 테스트 (CI와 동일)
pnpm test <file>    # 단일 파일 — 예: pnpm test src/feature/drawing/model/useDrawingStrokes.test.ts
pnpm test:watch     # watch 모드
pnpm test:coverage  # 커버리지 (v8, HTML + LCOV)
pnpm lint           # ESLint
pnpm format         # Prettier 적용 / pnpm format:check 는 검사만
pnpm qa             # 앱인토스 심사 기준 자동 검증 / pnpm qa:ci 는 WARN도 실패 처리
```

## 코드 컨벤션

- 컴포넌트는 **화살표 함수**로 작성, **파일 마지막 줄에서 export** (default 또는 named).
- FSD 슬라이스 폴더명은 **camelCase** (`phaseHeader`, `myScoreCard`).
- 상태는 **useState/useEffect 기반** — 전역 스토어(Zustand 등) 없음.
- TDS `<Toast>` 노출 상태는 컴포넌트마다 `useState` 하지 말고 **`shared/lib`의 `useToast()`**(`{ open, text, show, close }`)로 통일.
- Tailwind CSS v4 문법, 사용자 문구 해요체 (위 "반드시 지킬 규칙" 참조).
- **상수·도메인 타입은 사용처에 인라인하지 말고 슬라이스의 `config/`로 분리.** 시간/임계값 등 튜닝 매직 넘버, 슬라이스 외부와 공유하는 도메인 타입이 대상 (예: `feature/drawing/config/scoring.ts`의 `SCORE_DEBOUNCE_MS`, `TREND_THRESHOLD`, `ScoreTrend`). 단일 함수 내부에서만 쓰는 임시 상수는 그대로 둬도 됨.

## 아키텍처 (FSD)

Feature-Sliced Design. 레이어: `app` → `views` → `feature` → `entities` → `shared`.

**Public API 규칙 (ESLint `no-restricted-imports`로 강제):** 각 레이어는 `index.ts`로 export를 캡슐화한다.

- `shared/lib`: 단일 진입점 — `@/shared/lib` ✓ / `@/shared/lib/useCountdown` ✗
- `shared/ui`, `shared/assets`: 세그먼트 단위 — `@/shared/ui/score` ✓ / `@/shared/ui/score/Score` ✗
- `feature`/`entities`/`views`: 슬라이스 단위 — `@/feature/drawing` ✓ / `@/feature/drawing/ui/Toolbar` ✗

슬라이스별 역할 (코드 구조만으로는 알기 어려운 의도):

```text
views/      dashboard 홈("/", 일일 1회 자동 진입 — model/useDailyAutoStart·출석 자동 체크인),
            login, memorize(그림 기억), drawing(캔버스), submitted(제출 완료),
            ranking(TOP100 갤러리), rankingDetail("/drawing/:drawingId"),
            archive("/archive" 기록 아카이브), mission("/mission" 미션 목록)
            ※ landing은 라우터 밖 — App.tsx의 세션당 1회 진입 게이트
feature/    drawing(캔버스/툴바·스트로크 모델·채점 훅), login(토스 OAuth 훅),
            playChance(도전 시작 단일 훅 useStartGame·기회/광고 충전·하단바 FAB PlayNavButton),
            share(점수공유·친구초대 ShareSheet), notification(알림 동의 토글·벨 버튼)
entities/   myScoreCard(+useMyDrawings), podium(usePodium 훅 — TOP3, 컴포넌트는 삭제됨),
            ranking(리스트 항목), scoreDetailCard(점수 상세), phaseHeader(단계 헤더),
            attendance(출석 현황·진행 UI), missionCard(오늘의 미션 카드·섹션),
            point(usePointSummary), drawingCanvas(리플레이/정적 캔버스)
shared/     api(serverTossApi·Firebase Analytics init), hooks(useAbortableQuery),
            lib(useCountdown·useExitGuard·useRequiredState·useToast·tossAds·퍼널 계측
                analytics/attribution/funnelEvents·getAnonymousHash·formatLocalDate 등),
            ui(bannerAd·score·exitDialog·bottomNav·bottomCTAButton·maskedIcon), assets
app/config/ router.tsx, AnalyticsTracker(화면 전환 계측), vitest.setup.ts
```

`App.tsx`는 `TDSMobileAITProvider`로 감싸고, **세션당 1회 `LandingView` 게이트**(`sessionStorage.landingSeen`)를 거친 뒤 `PlayChanceProvider` + `RouterProvider` + `NotificationBellButton`을 렌더한다. 마운트 시 `initTossAdsOnce`·`initFirebaseAnalyticsOnce`·`captureAttributionOnce`를 1회 호출한다.

## 도메인 메모

### API 레이어 (`shared/api/serverToss.ts`)

- 모든 요청은 `request<T>()` 헬퍼 경유. `localStorage.access_token`을 `Authorization: Bearer`로 자동 주입.
- **401 자동 토큰 재발급**: 401 시 `appLogin()` → `/oauth/toss/login`으로 재발급 → 원 요청 1회 재시도. `reissuePromise` 싱글톤으로 동시 401을 합침. 로그인 엔드포인트 자체는 재시도 제외(무한 루프 방지).
- 모든 응답은 `@toss/shared`의 Zod 스키마로 파싱 (`LoginResponseSchema`, `PromptResponseSchema`, `SimilarityResponseSchema` 등).
- 에러 메시지는 해요체 ("요청 실패", "토큰 재발급 응답이 올바르지 않아요").
- Vite dev proxy: `/api` → `http://localhost:3000` (`/api` prefix는 rewrite로 제거). 로컬 개발 시 server-toss가 3000 포트에서 실행 중이라고 가정.

### 게임 플레이 모델 (도전 시작 — `feature/playChance`)

- **`useStartGame`이 도전 시작의 단일 훅.** 대시보드 CTA(`PlayCtaButton`)·하단바 중앙 FAB(`PlayNavButton`)·SubmittedView 재도전이 모두 공유한다. 시작 흐름(navigate·토스트)을 호출부에 중복 구현하지 말고 이 훅을 거칠 것.
  - `start(source)`: 보유한 기회로 바로 시작 → `startPlay()` → `/memorize`(`replace`).
  - `startWithAd(source)`: 광고를 보고 기회를 충전한 뒤 시작(대시보드 "광고 보고 도전하기"와 동일). 광고 미로딩이면 `reloadAd()` 후 `{ ok:false, reason:"ad_not_ready" }`.
  - 두 함수 모두 `{ ok:true } | { ok:false, reason:"no_prompt"|"error"|"ad_not_ready" }`를 반환 → 호출부는 reason만 토스트로 매핑한다.
  - 시작 성공 시 `localStorage.lastPlayed_${hash}`(오늘 날짜)를 기록해 자동시작 게이트를 닫는다 — 제출 없이 이탈해도 재자동시작/이중차감 방지.
- **일일 1회 자동 진입은 `useDailyAutoStart`(`views/dashboard/model`)가 담당.** `getAnonymousHash()`로 익명 해시 획득 → `lastPlayed_${hash}`가 오늘이면 자동시작 없이 대시보드만(`playedToday`), 아니면 마운트당 1회 `start("auto")`. `fromSubmitted` 복귀 시 등록/적립 토스트.
- `getAnonymousHash()` 실패 시 hash="local" 폴백.

### 출석·미션·포인트 (대시보드 동반 도메인)

- **출석(`entities/attendance`)**: `useAttendanceStatus`(현황)·`AttendanceProgress`/`AttendanceSummary`(7일 진행 UI). 대시보드 첫 노출 시 `views/dashboard/model/useAttendanceAutoCheckIn`이 하루 1회 자동 체크인 → 결과를 `AttendanceResultSheet`(연속/끊김) 바텀시트로 안내. 출석 시트와 알림 시트가 겹치지 않게 출석 처리가 끝나고(settled) 닫힌 뒤에만 알림을 띄운다. 끊긴 연속 복구는 보상형 광고를 끝까지 본 경우에만 인정(`useFullScreenAd` 확장).
- **미션(`entities/missionCard` + `views/mission`)**: `useTodayMissions`(대시보드 카드)·`useMyMissions`(미션 탭), `MissionCard`/`MissionSection`/`MissionCardSkeleton`/`TutorialMissionSection`. 미션 액션 세션키에 KST 날짜 경계를 적용해 자정 넘어가면 액션이 재집계된다.
- **포인트(`entities/point`)**: `usePointSummary` — 출석과 분리된 `/points/me` 리소스. 출석 체크인·복구로 포인트(마일스톤)가 바뀔 수 있으므로 대시보드는 출석 현황과 포인트를 **함께 재조회**한다.
- **리플레이 캔버스(`entities/drawingCanvas`)**: TOP100 갤러리·아카이브 상세에서 획을 시간순으로 다시 그려 보여준다. `useDrawingReplay`·`animateDrawing`(easeout)·`ReplayDrawingCanvas`·`StaticDrawingCanvas`, 화면 안에 들어왔을 때(`isVisible`) 리플레이를 재생한다.

### TDS 사용

- `TDSMobileAITProvider`로 App 최상위를 감싸야 TDS 컴포넌트가 동작.
- Import: `import { Button, BottomCTA, CTAButton, Top } from '@toss/tds-mobile'`.
- 하단 버튼 2개는 `BottomCTA.Double` (`leftButton` + `rightButton` with `CTAButton`).
- Typography는 `Top.TitleParagraph`, `Top.SubtitleParagraph`, `Paragraph.Text` 등 TDS 토큰.
- TDS는 일반 브라우저에서 동작하지 않음 → UI 확인은 샌드박스에서 ("로컬 검증·테스트" 절).

### 앱인토스 SDK

- `useExitGuard` (`shared/lib`): Android 하드웨어 뒤로가기를 가로채 다이얼로그 표시. iOS 스와이프 제스처도 동시 비활성화.
- `ExitDialog` (`shared/ui/exitDialog`): `useExitGuard` + TDS `ConfirmDialog`를 묶은 **앱 종료 확인** 다이얼로그(대시보드·랜딩). 뷰별 이탈/제출 확인(memorize·drawing·submitted)은 confirm 동작이 제각각이라 각 뷰가 `useExitGuard`로 직접 구성한다. (이름이 `ExitConfirmDialog`면 qa dark-pattern 정규식에 오탐되므로 `ExitDialog` 유지)
- `initTossAdsOnce` (`shared/lib`): `App.tsx`에서 1회 초기화. `<BannerAd>` 컴포넌트로 노출.
- 캔버스 화면 보호용으로 `granite.config.ts`에서 `bounces`/`pullToRefreshEnabled`/`allowsBackForwardNavigationGestures`를 모두 false로 둠 (`webViewProps.type: "partner"`). 뷰별로 필요 시 재설정 가능.

### 글로벌 레이아웃 (`index.css`)

- `#root`에 `flex column` + `height: 100%` + `padding-bottom: env(safe-area-inset-bottom)`. 별도 Layout 컴포넌트 없음.
- CSS 변수: `--page-px: 20px`(좌우 패딩 — 각 페이지에서 `px-(--page-px)` 적용), `--card-mx: 12px`, 색상 토큰(`--color-toss-blue`, `--color-grey`, `--color-gold` 등).

### 라우팅 (`app/config/router.tsx`)

- `createBrowserRouter` 기반. 모든 라우트는 `AnalyticsTracker`(app/config) 하위에 묶여 화면 전환을 계측한다. 샌드박스 앱은 루트(`/`) → `DashboardView`로 진입.
- 라우트: `/login`, `/`, `/memorize`, `/drawing`, `/drawing/:drawingId`(rankingDetail), `/submitted`, `/ranking`, `/archive`, `/mission`.
- 하단 탭(`shared/ui/bottomNav`)이 노출되는 경로는 `/`·`/archive`·`/mission`·`/ranking`(`NAV_VISIBLE_PATHS`).

### 설정

- `granite.config.ts`: `appName` "we-are-all-da-vinci", `port` 5173, `host`는 `WEBVIEW_HOST` 환경변수 또는 "localhost"(dev.js가 주입).
- Path alias (`vite.config.ts`·`tsconfig.app.json`·`vitest.config.ts`에 **모두 동기화** 필요): `@/*` → `./src/*`, `@toss/shared` → `../packages/toss-shared/src`.

## 테스트

- Vitest(jsdom, `globals: true`), setup `src/app/config/vitest.setup.ts`. 패턴 `src/**/*.{test,spec}.{ts,tsx}`, `passWithNoTests` 활성.
- `vitest.setup.ts`가 외부 의존성을 전부 모킹: `@toss/tds-mobile` 컴포넌트 전체, `@toss/tds-mobile-ait`의 `TDSMobileAITProvider`, `@apps-in-toss/web-framework`의 모든 export, `HTMLCanvasElement.prototype.getContext`·`ResizeObserver` 폴리필.
- 모든 테스트 description은 한국어 — `describe`·`it` 둘 다. 컴포넌트·훅 이름을 그대로 suite 제목으로 쓰지 말 것. ✗ `describe('StreakStatsCard')` → ✓ `describe('연속 출석 통계 카드')`. (새/수정 spec에서 영문 suite 제목은 반드시 한국어 설명으로 바꾼다.)

## QA / CI

`pnpm qa` (`scripts/qa.ts`) — 8개 자동 검증: tooling, granite-config, tds-usage, ux-writing(해요체·다크패턴 단어), dark-pattern, ad-integration, external-links, bundle-size. 수동 QA(실기기)는 `QA_CHECKLIST.md` 참고.

CI (PR에서 `client-toss/**` 또는 `packages/**` 변경 시): `pnpm lint` → `format:check` → `test:coverage` → `qa:ci`(WARN도 실패) → `build`.
