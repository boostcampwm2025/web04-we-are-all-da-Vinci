# Server-Toss (NestJS REST API) - CLAUDE.md

> 이 워크스페이스는 기존 게임 서버(server/)와 독립적입니다. 루트 CLAUDE.md는 모노레포 인프라와 Git 워크플로우만 참고하세요.

## Overview

- NestJS 11.x REST-only 백엔드 (Apps-in-Toss 미니앱용)
- **WebSocket, Redis, Socket.io, 스케줄링 없음** — 매 획 단위의 유사도 계산을 HTTP로 처리
- 유사도는 **서버에서 계산** (기존 `server/`는 클라가 계산해서 보냄) — 클라 값 신뢰 X

## Tech Stack

| 항목       | 값                             |
| ---------- | ------------------------------ |
| Framework  | NestJS ^11.1.17                |
| ORM        | MikroORM ^7.x (MySQL 8.4)      |
| Logging    | nestjs-pino (구조화 JSON 로그) |
| Validation | Zod ^4.3.6                     |
| Docs       | @nestjs/swagger (`/docs`)      |
| Test       | Jest ^30.0.0 (ts-jest)         |
| Target     | ES2023, CommonJS               |

## Development Commands

```bash
pnpm start:dev     # dev + watch
pnpm build         # production build
pnpm start:prod    # run build
pnpm test          # jest
pnpm lint
pnpm format
```

## Path Aliases

- `src/*` → `src/*`
- `@toss/shared` → `../packages/toss-shared/dist` (공유 Zod 스키마/타입)
- `@davinci/similarity` → `../packages/similarity/dist` (`preprocessStrokes`, `scoreFinalSimilarity`)
- 런타임 해석: tsconfig-paths (start 스크립트에서 사용)

## Endpoints

| Method | Path                  | 역할                                                                    |
| ------ | --------------------- | ----------------------------------------------------------------------- |
| GET    | `/health`             | 헬스체크                                                                |
| POST   | `/oauth/toss/login`   | Apps-in-Toss OAuth 로그인                                               |
| POST   | `/oauth/toss/logout`  | 로그아웃                                                                |
| GET    | `/user/me`            | 현재 사용자 정보                                                        |
| GET    | `/prompt`             | 오늘의 기준 프롬프트 `{ promptId, strokes }` (KST)                      |
| POST   | `/strokes`            | 실시간 유사도 계산. 매 획마다 호출, **DB 저장 없음**, `Similarity` 반환 |
| POST   | `/drawing`            | **최종 제출**. 유사도 재계산 후 `drawings` 테이블에 저장                |
| GET    | `/drawing/me`         | 내 최근 drawing                                                         |
| GET    | `/drawing/:drawingId` | drawing 단건 조회                                                       |
| GET    | `/rankings`           | 오늘 랭킹 리스트                                                        |
| GET    | `/rankings/me`        | 내 랭킹                                                                 |
| GET    | `/rankings/podium`    | 포디움                                                                  |
| POST   | `/adviews`            | 광고 시청 기록                                                          |
| GET    | `/chances/me`         | 남은 게임 기회                                                          |
| POST   | `/chances/charge`     | 기회 충전 (광고 시청 등)                                                |
| POST   | `/chances/consume`    | 기회 소비                                                               |

스키마 단일 소스는 `packages/toss-shared/src/schemas/`(`drawing.schema.ts`, `chance.schema.ts` 등). `/strokes`는 클라이언트가 `promptId`를 보내지 않는다 — 서버가 오늘 날짜의 `daily_prompts`로 자동 매칭해 프롬프트 조작을 차단.

## Architecture

```text
src/
├── main.ts                          - bootstrap: migration → seed → listen, 전역 ZodExceptionFilter
├── app.module.ts                    - 루트 모듈 (Mikro/Config/Logger + 도메인 모듈)
├── mikro-orm.config.ts              - forceUtcTimezone, allowGlobalContext
├── common/
│   ├── util/
│   │   ├── today.ts                 - getTodayKst(): KST 오늘 날짜의 UTC 자정 Date
│   │   └── time.util.ts             - getSeoulDayRange(): 서울 기준 하루 범위 [start, end)
│   ├── entitiy/base.entity.ts       - 공통 BaseEntity (디렉토리명 typo 그대로 유지)
│   ├── zod-validation.pipe.ts       - @Body() Zod 검증 파이프
│   ├── zod-exception.filter.ts      - ZodError → 400 + issues
│   ├── http-exception.filter.ts     - HttpException → 표준 응답 포맷
│   ├── exception-response.ts        - 에러 응답 공통 형태
│   ├── logging/, middleware/        - 요청 로깅 등 횡단 관심사
├── health/                          - GET /health
├── modules/
│   ├── auth/                        - POST /oauth/toss/login, /logout (Toss OAuth)
│   ├── user/                        - GET /user/me
│   ├── prompt/                      - GET /prompt + 빈 DB 시드 + 메모리 캐시
│   ├── drawing/                     - POST /strokes, /drawing, GET /drawing/me, /drawing/:id
│   ├── chance/                      - GET /chances/me, POST /chances/{charge,consume}
│   ├── ad/                          - POST /adviews (광고 시청 기록)
│   ├── ranking/                     - GET /rankings, /rankings/me, /rankings/podium + 스냅샷 서비스
│   ├── point/                       - 포인트 적립/차감 (다른 모듈에서 내부 의존, 외부 라우트 없음)
├── seeders/                         - DatabaseSeeder + 도메인별 seeder (factories, helpers)
├── migrations/                      - MikroORM 마이그레이션
└── test-setup/
    └── setup-mikro-orm-mocks.ts     - jest setupFiles: MikroORM 데코레이터/모듈 공용 모킹
```

## Boot Flow (`main.ts`)

1. `NestFactory.create(AppModule)` + pino logger + `ZodExceptionFilter` 전역 등록
2. CORS / Swagger(`/docs`) 세팅
3. **비-프로덕션**에서만 `orm.migrator.up()` 실행
4. `PromptSeedService.run()` — `prompts`/`daily_prompts`가 둘 다 빈 경우에만 시드
5. `app.listen(PORT)`

시드는 `data/promptStrokes.json`의 `{ date, strokes }[]`를 읽어 `prompts` insert → `daily_prompts`에 JSON의 `date` 필드를 그대로 `prompt_date`로 배정. 날짜가 명시적이라 배열 순서에 의존하지 않음.

## Conventions

- **KST 날짜**: `common/util/today.ts`의 `getTodayKst()` (UTC 자정 Date) 또는 `common/util/time.util.ts`의 `getSeoulDayRange()` (`[start, end)` 범위)로 통일. 컨트롤러/서비스가 직접 `new Date()`로 날짜 결정하지 말 것.
- **MikroORM v7**: `persistAndFlush` 없음 → `em.persist(e); await em.flush()`. `allowGlobalContext`는 테스트 환경에서만 활성 — 서비스/시드에서는 `em.fork()` 필수.
- **Zod 검증** (NestJS 기본 `ValidationPipe`/`class-validator` 미사용):
  - 컨트롤러: `@Body(new ZodValidationPipe(Schema))`. 파이프는 `ZodError`를 그대로 throw → `ZodExceptionFilter`(전역)가 400으로 변환.
  - `ZodError`를 `BadRequestException`으로 감싸지 말 것 — `@Catch(ZodError)` 필터를 우회해서 응답 포맷이 갈라진다.
- **유사도 재계산**: `POST /drawing`는 클라 값을 저장하지 않고 서버에서 다시 계산한 값을 저장.
- **`promptId` 전송 금지**: 클라는 보내지 않고, 서버가 오늘 날짜로 매칭.
- **Swagger**: 모든 컨트롤러에 `@ApiTags`, `@ApiOperation`, `@ApiResponse` 적용. `/docs`에서 확인 가능. `@ApiBody`는 Zod 스키마를 JSON Schema로 수동 기술 (Zod → OpenAPI 자동 변환 미사용).

## Logging

`nestjs-pino` 기반 구조화 로그. HTTP 자동 로그(`http.request.completed/failed`) + Sensitive 헤더 redact + request id 전파는 `common/logging/logger.config.ts`가 처리.

### 로거 인스턴스

```ts
import { Logger } from "@nestjs/common";

private readonly logger = new Logger(ServiceName.name);
```

- 기본은 `@nestjs/common`의 `Logger` (nestjs-pino가 내부적으로 pino로 위임)
- request 컨텍스트에 메타를 박아야 할 때만 `PinoLogger` 직접 DI (예: `jwt-auth.guard.ts`의 `logger.assign({ userKey })`)

### 호출 시그니처: `(logObject, "한국어 메시지")`

객체-first + 한국어 메시지 second. **메시지 없이 객체만 넘기지 말 것** — 운영 중 가독성을 위해 두 인자 모두 필수.

```ts
this.logger.log({ event, userKey, ...meta }, "토스 로그인 성공");
this.logger.warn({ event, ...meta }, "랭킹 스냅샷 갱신 중복 요청 스킵");
this.logger.error({ event, err }, "Toss API 통신 오류");
```

문자열 한 줄 로그(`logger.warn(\`failed: ${msg}\`)`)는 **금지** — 검색/대시보드에서 잡히지 않는다.

### `event` 필드 규칙: `<domain>.<action>.<outcome>`

- 항상 `logObject`의 첫 번째 키
- `.` 구분 3단 + outcome 디테일은 snake_case (예: `auth.login.toss_transport_failed`)
- **outcome은 과거분사**: `succeeded` / `failed` / `started` / `completed` / `skipped` / `denied`
  - `success`(현재형), `success_ed` 같은 변형 금지
  - `denied` 는 **정책상 거부**(권한/한도/whitelist miss) 전용 — 시스템 실패는 `failed`
- 예: `chance.charge.succeeded`, `chance.consume.denied`, `drawing.score.failed`, `ranking.snapshot.refresh.skipped`

### 레벨 컨벤션

| 레벨         | 용도                      | 예                                                   |
| ------------ | ------------------------- | ---------------------------------------------------- |
| `log` (info) | 정상 비즈니스 이벤트 완료 | `auth.login.succeeded`, `drawing.submit.succeeded`   |
| `debug`      | 노이즈 많은 정상 흐름     | `drawing.score.succeeded` (매 stroke), 캐시 hit/miss |
| `warn`       | 의심스럽지만 시스템 정상  | 4xx 외부 API, 정책 거부, slow 임계 초과, `*.skipped` |
| `error`      | 시스템/외부 의존 실패     | 5xx 외부 API, 복호화/저장 실패, 예기치 못한 예외     |

같은 이벤트라도 임계치에 따라 레벨만 올리는 패턴 OK (예: `drawing.score.succeeded` → `durationMs >= SLOW_THRESHOLD` 면 `warn`).

### 에러 로깅

```ts
this.logger.error(
  { event: "auth.login.toss_api_failed", statusCode: err.statusCode, err },
  `Toss API 오류 (HTTP ${err.statusCode})`,
);
throw new BadGatewayException("Toss API 오류가 발생했어요.");
```

- `err`는 객체 그대로 넘김 — pino의 `err` serializer가 stack까지 직렬화
- 외부 의존 실패는 도메인 친화적 NestJS 예외로 변환해 throw

### 메타 필드 권장

| 필드         | 용도                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| `userKey`    | 행위자 식별                                                                  |
| `durationMs` | 외부 호출/계산 소요 시간                                                     |
| `reason`     | 거부/실패 사유 (snake_case 토큰: `whitelist_miss`, `daily_cap`, `no_chance`) |
| `err`        | 에러 객체 그대로 (string 변환 X)                                             |
| `statusCode` | 외부 HTTP 호출 응답 코드                                                     |

## Testing

- Jest (ts-jest), `*.spec.ts`, `passWithNoTests` 활성
- `describe`/`it` **한국어** (루트 CLAUDE.md 규약)
- **MikroORM 모킹 일원화**: `src/test-setup/setup-mikro-orm-mocks.ts`를 jest `setupFiles`에 등록 → 각 spec에서 `jest.mock("@mikro-orm/...")` 반복 불필요
- Controller 레이어는 `Test.createTestingModule` + `useValue` 서비스 목 + supertest로 e2e 스모크(라우팅/상태코드). `app.useGlobalFilters(new ZodExceptionFilter())` 등록 필수 — 없으면 Zod 검증 실패가 400 대신 500으로 떨어진다.
- `moduleNameMapper`: `@toss/shared`, `@davinci/similarity`

## Environment Configuration

| 변수                                                      | 설명                                            | 기본값              |
| --------------------------------------------------------- | ----------------------------------------------- | ------------------- |
| `PORT`                                                    | 서버 포트                                       | 3001                |
| `CORS_ORIGIN`                                             | 허용 오리진 (쉼표 구분)                         | `*`                 |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL 접속                                      | `.env.example` 참조 |
| `DISABLE_PROMPT_CACHE`                                    | `true` 설정 시 `PromptService` 메모리 캐시 우회 | unset               |
