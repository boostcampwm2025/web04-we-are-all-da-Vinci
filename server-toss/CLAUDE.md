# Server-Toss (NestJS REST API)

Apps-in-Toss 미니앱(`client-toss`)용 NestJS 11.x **REST 전용** 백엔드. 기존 게임 서버(`server/`)와 **완전히 독립** — WebSocket/Redis/Socket.io 없음(단, 포인트 지급·랭킹/알림 정리는 `@nestjs/schedule` cron으로 운영, 랭킹 변동 알림은 `@nestjs/event-emitter` 도메인 이벤트로 처리). 매 획 단위 유사도 계산을 HTTP로 처리한다. **유사도는 서버에서 계산**하며 클라이언트가 보낸 값은 신뢰하지 않는다. 루트 CLAUDE.md는 모노레포 인프라·Git 워크플로우만 참고.

스택: NestJS 11, MikroORM v7 (MySQL 8.4), nestjs-pino(구조화 JSON 로그), Zod, @nestjs/swagger(`/docs`), @nestjs/schedule(cron)·@nestjs/event-emitter(도메인 이벤트), Jest(ts-jest). Target ES2023 / CommonJS. 정확한 버전은 `package.json`이 권위.

## 반드시 지킬 규칙 (위반 잦음 — 작업 전 확인)

- **날짜를 직접 `new Date()`로 결정하지 말 것.** KST 기준 유틸만 사용 — `common/util/today.ts`의 `getTodayKst()`(KST 오늘의 UTC 자정 Date) 또는 `common/util/time.util.ts`의 `getSeoulDayRange()`(`[start, end)` 범위).
- **`ZodError`를 `BadRequestException` 등으로 감싸지 말 것.** 컨트롤러는 `@Body(new ZodValidationPipe(Schema))`를 쓰고 파이프가 `ZodError`를 그대로 throw → 전역 `ZodExceptionFilter`가 400으로 변환한다. 감싸면 필터를 우회해 응답 포맷이 갈라진다.
- **서비스·시드에서 `em.fork()` 필수.** `allowGlobalContext`는 테스트 환경(`NODE_ENV=test`)에서만 켜진다.
- **유사도는 서버에서 재계산.** `POST /drawing`은 클라가 보낸 유사도 값을 저장하지 않고 서버가 다시 계산해 저장한다. 클라이언트는 `promptId`를 보내지 않으며, 서버가 오늘 날짜의 `daily_prompts`로 자동 매칭한다 (프롬프트 조작 차단).
- **로그는 `(logObject, "한국어 메시지")` 2인자 필수.** 객체만 넘기거나 문자열 한 줄 로그 금지. `logObject`의 첫 키는 항상 `event: "<domain>.<action>.<outcome>"` → "로깅" 절 참조.
- **MikroORM v7에 `persistAndFlush` 없음** → `em.persist(e); await em.flush()`.
- 테스트 `describe`/`it` 설명은 **한국어** (루트 CLAUDE.md 규약).

## 명령어

```bash
pnpm start:dev    # dev + watch
pnpm build        # production build
pnpm start:prod   # 빌드 결과 실행
pnpm test         # jest
pnpm lint
pnpm format
```

런타임 path 해석은 `tsconfig-paths` (start 스크립트에서 사용). Path alias:

- `src/*` → `src/*`
- `@toss/shared` → `../packages/toss-shared/dist` (공유 Zod 스키마/타입)
- `@davinci/similarity` → `../packages/similarity/dist` (`preprocessStrokes`, `scoreFinalSimilarity`)

## 엔드포인트

| Method | Path                                    | 역할                                                                             |
| ------ | --------------------------------------- | -------------------------------------------------------------------------------- |
| GET    | `/health`                               | 헬스체크                                                                         |
| POST   | `/oauth/toss/login`                     | Apps-in-Toss OAuth 로그인                                                        |
| POST   | `/oauth/toss/logout`                    | 로그아웃                                                                         |
| GET    | `/user/me`                              | 현재 사용자 정보                                                                 |
| POST   | `/plays/start`                          | 게임 시작 — 기회 소비 후 오늘의 기준 프롬프트 `{ promptId, strokes }` 반환 (KST) |
| POST   | `/strokes`                              | 실시간 유사도 계산. 매 획마다 호출, **DB 저장 없음**, `Similarity` 반환          |
| POST   | `/drawing`                              | **최종 제출**. 유사도 재계산 후 `drawings` 테이블에 저장                         |
| GET    | `/drawing/me`                           | 내 최근 drawing                                                                  |
| GET    | `/drawing/:drawingId`                   | drawing 단건 조회                                                                |
| GET    | `/rankings`                             | 오늘 랭킹 리스트                                                                 |
| GET    | `/rankings/me`                          | 내 랭킹                                                                          |
| GET    | `/rankings/podium`                      | 포디움 TOP3 + 오늘 참가자 수 `{ podium, participantCount }`                      |
| GET    | `/archive/summary`                      | 아카이브 요약(플레이 일자·통계)                                                  |
| GET    | `/archive/days/:date`                   | 특정 날짜의 제출/랭킹 상세                                                       |
| GET    | `/notifications/daily-prompt/agreement` | 일일 프롬프트 알림 동의 조회                                                     |
| POST   | `/notifications/daily-prompt/agreement` | 일일 프롬프트 알림 동의 저장                                                     |
| GET    | `/notifications/overtaken/agreement`    | 랭킹 추월 알림 동의 조회                                                         |
| POST   | `/notifications/overtaken/agreement`    | 랭킹 추월 알림 동의 저장                                                         |
| GET    | `/chances/me`                           | 남은 게임 기회                                                                   |
| POST   | `/chances/charge`                       | 기회 충전 (광고 시청/공유 등)                                                    |
| GET    | `/points/me`                            | 받은 포인트 요약 (누적/오늘, 진행 중 지급 합산)                                  |
| GET    | `/attendance/me`                        | 출석 현황 (연속·사이클·복구 가능 여부)                                           |
| POST   | `/attendance/check-in`                  | 오늘 출석 체크인 (KST 멱등)                                                      |
| POST   | `/attendance/recover`                   | 끊긴 연속 복구 (보상형 광고 완주 시)                                             |
| GET    | `/missions/today`                       | 오늘의 미션(일일) 경량 조회                                                      |
| GET    | `/missions/me`                          | 내 미션 목록 조회                                                                |
| POST   | `/missions/me`                          | 오늘의 미션 할당                                                                 |
| POST   | `/missions/action`                      | 미션 액션 보고 (방문/공유/재시도)                                                |

요청/응답 스키마의 단일 소스는 `packages/toss-shared/src/schemas/` (`drawing.schema.ts`, `chance.schema.ts`, `attendance.schema.ts`, `mission.schema.ts`, `point.schema.ts` 등 9개). `/strokes`는 클라이언트가 `promptId`를 보내지 않는다 — 서버가 오늘 날짜의 `daily_prompts`로 자동 매칭.

## 아키텍처

```text
src/
├── main.ts                          - bootstrap: migration → seed → listen, 전역 ZodExceptionFilter
├── app.module.ts                    - 루트 모듈 (Mikro/Config/Logger + 도메인 모듈)
├── mikro-orm.config.ts              - forceUtcTimezone, allowGlobalContext
├── common/
│   ├── util/today.ts                - getTodayKst(): KST 오늘 날짜의 UTC 자정 Date
│   ├── util/time.util.ts            - getSeoulDayRange(): 서울 기준 하루 범위 [start, end)
│   ├── entitiy/base.entity.ts       - 공통 BaseEntity (디렉토리명 typo 그대로 유지)
│   ├── zod-validation.pipe.ts       - @Body() Zod 검증 파이프
│   ├── zod-exception.filter.ts      - ZodError → 400 + issues
│   ├── http-exception.filter.ts     - HttpException → 표준 응답 포맷
│   ├── exception-response.ts        - 에러 응답 공통 형태
│   └── logging/, middleware/        - 요청 로깅 등 횡단 관심사
├── external/                        - ExternalModule (토스 API 등 외부 연동 공용 래퍼)
├── health/                          - GET /health
├── modules/
│   ├── auth/                        - POST /oauth/toss/login, /logout (Toss OAuth)
│   ├── user/                        - GET /user/me
│   ├── prompt/                      - 오늘의 프롬프트 제공(서비스, 외부 라우트 없음) + 빈 DB 시드 + 메모리 캐시
│   ├── play/                        - POST /plays/start (기회 소비 + 프롬프트 반환)
│   ├── drawing/                     - POST /strokes, /drawing, GET /drawing/me, /drawing/:id (저장 성공 시 MissionService 직접 호출 + 랭킹 변동 시 RANKING_CHANGED 이벤트 emit)
│   ├── chance/                      - GET /chances/me, POST /chances/charge (consume은 내부 트랜잭션 전용) + 광고 시청 기록(ad-view.entity, 별도 ad 모듈 없음)
│   ├── ranking/                     - GET /rankings, /rankings/me, /rankings/podium + 스냅샷 서비스 + ranking.cleanup 스케줄러
│   ├── archive/                     - GET /archive/summary, /archive/days/:date
│   ├── dailyRanking/                - 자정 스냅샷(daily_user_rankings) 서비스, 외부 라우트 없음
│   ├── notification/               - GET·POST /notifications/{daily-prompt,overtaken}/agreement + 발송/정리 스케줄러(daily-prompt-notification·sent-notification-stale-cleanup) + RANKING_CHANGED 이벤트 리스너(추월 알림)
│   ├── attendance/                  - GET /attendance/me, POST /attendance/{check-in,recover} (7일 사이클·마일스톤 포인트)
│   ├── mission/                     - GET /missions/{me,today}, POST /missions/{me,action} + MissionSeedService(data/missions.json) + command/repository/service 구조
│   └── point/                       - GET /points/me + 포인트 적립/차감(다른 모듈 내부 의존) + 지급 스케줄러(point-grant·point-grant-purge)
├── seeders/                         - DatabaseSeeder + 도메인별 seeder
├── migrations/                      - MikroORM 마이그레이션
└── test-setup/setup-mikro-orm-mocks.ts  - jest setupFiles: MikroORM 데코레이터/모듈 공용 모킹
```

### Boot Flow (`main.ts`)

1. `NestFactory.create(AppModule)` + pino logger + `ZodExceptionFilter` 전역 등록 (AppModule이 `ScheduleModule`·`EventEmitterModule`을 import → cron·도메인 이벤트 등록)
2. CORS / Swagger(`/docs`) 세팅
3. **비-프로덕션**에서만 `orm.migrator.up()` 실행
4. `PromptSeedService.run()` — `prompts`/`daily_prompts`가 둘 다 빈 경우에만 시드
5. `MissionSeedService.run()` (`modules/mission/service/mission.seed`) — `data/missions.json`에서 미션 마스터 데이터 동기화
6. `app.listen(PORT)`

시드는 `data/promptStrokes.json`의 `{ date, strokes }[]`를 읽어 `prompts`에 insert → `daily_prompts`에 JSON의 `date`를 그대로 `prompt_date`로 배정. 날짜가 명시적이라 배열 순서에 의존하지 않는다.

## 도메인 메모

- **출석(attendance)**: `user_attendances`는 유저당 1행(`cycleDay`·`lastCheckedDate`·`recoverableDay`). 7일 사이클, 체크인은 KST 멱등(같은 날 중복 호출 무해). 3·7일 마일스톤에서 프로모션 5P 지급. 끊긴 연속은 보상형 광고를 **끝까지 본 경우에만** 복구(`POST /attendance/recover`).
- **미션(mission)**: 과거 quest에서 리네임 — **엔티티/마이그레이션/일부 util에는 `quest` 명칭이 잔존**(테이블·컬럼명 호환 목적, 의도된 것). 그리기 미션 진행은 `save-drawing.service`가 저장 성공 시 `MissionService.onDrawingSubmitted()`를 **직접 호출**(DrawingModule이 MissionModule import)한다. 방문/공유 등은 클라가 `POST /missions/action`으로 보고. 미션/마일스톤 포인트 지급액은 단일 소스 `REWARD_POINT`(`modules/point/point.contants.ts` — 파일명 typo 그대로 유지).
- **포인트(point)**: `GET /points/me` 요약은 **지급 성공분 + 진행 중(pending) 지급 합산** → 적립 직후 즉시 반영되고, 지급 스케줄러(`point-grant`) 성공/실패 시 합계가 자동 정합되어 깜빡임·이중집계가 없다. `point-grant-purge`는 만료 pending 정리.

## 컨벤션

- **KST 날짜**: `getTodayKst()` / `getSeoulDayRange()`만 사용 (위 "반드시 지킬 규칙" 참조). 컨트롤러·서비스가 직접 `new Date()`로 날짜를 결정하지 말 것.
- **MikroORM v7**: `persistAndFlush` 없음 → `em.persist(e); await em.flush()`. 서비스·시드에서는 `em.fork()` 필수 (`allowGlobalContext`는 `NODE_ENV=test`에서만 활성).
- **Zod 검증** (NestJS 기본 `ValidationPipe`/`class-validator` 미사용):
  - 컨트롤러: `@Body(new ZodValidationPipe(Schema))`. 파이프가 `ZodError`를 그대로 throw → 전역 `ZodExceptionFilter`가 400 + issues로 변환.
  - `ZodError`를 `BadRequestException`으로 감싸지 말 것 — `@Catch(ZodError)` 필터를 우회해 응답 포맷이 갈라진다.
- **유사도 / `promptId`**: `POST /drawing`은 서버 재계산 값만 저장. 클라는 `promptId` 미전송, 서버가 오늘 날짜로 매칭 (위 "반드시 지킬 규칙" 참조).
- **Swagger**: 모든 컨트롤러에 `@ApiTags`, `@ApiOperation`, `@ApiResponse` 적용 (`/docs`에서 확인). `@ApiBody`는 Zod 스키마를 JSON Schema로 수동 기술 — Zod → OpenAPI 자동 변환은 쓰지 않는다.

## 로깅

`nestjs-pino` 기반 구조화 로그. HTTP 자동 로그(`http.request.completed/failed`) + Sensitive 헤더 redact + request id 전파는 `common/logging/logger.config.ts`가 처리.

### 로거 인스턴스

```ts
import { Logger } from "@nestjs/common";

private readonly logger = new Logger(ServiceName.name);
```

- 기본은 `@nestjs/common`의 `Logger` (nestjs-pino가 내부적으로 pino로 위임).
- request 컨텍스트에 메타를 박아야 할 때만 `PinoLogger`를 직접 DI (예: `jwt-auth.guard.ts`의 `logger.assign({ userKey })`).

### 호출 시그니처: `(logObject, "한국어 메시지")`

객체-first + 한국어 메시지 second. **메시지 없이 객체만, 또는 문자열 한 줄 로그(`logger.warn(\`failed: ${msg}\`)`) 금지** — 검색/대시보드에서 잡히지 않는다.

```ts
this.logger.log({ event, userKey, ...meta }, "토스 로그인 성공");
this.logger.warn({ event, ...meta }, "랭킹 스냅샷 갱신 중복 요청 스킵");
this.logger.error({ event, err }, "Toss API 통신 오류");
```

### `event` 필드 규칙: `<domain>.<action>.<outcome>`

- 항상 `logObject`의 **첫 번째 키**.
- `.` 구분 3단 + outcome 디테일은 snake_case (예: `auth.login.toss_transport_failed`).
- **outcome은 과거분사**: `succeeded` / `failed` / `started` / `completed` / `skipped` / `denied`.
  - `success`(현재형) 같은 변형 금지.
  - `denied`는 **정책상 거부**(권한/한도/whitelist miss) 전용 — 시스템 실패는 `failed`.
- 예: `chance.charge.succeeded`, `chance.consume.denied`, `drawing.score.failed`, `ranking.snapshot.refresh.skipped`.

### 레벨 컨벤션

| 레벨         | 용도                      | 예                                                   |
| ------------ | ------------------------- | ---------------------------------------------------- |
| `log` (info) | 정상 비즈니스 이벤트 완료 | `auth.login.succeeded`, `drawing.submit.succeeded`   |
| `debug`      | 노이즈 많은 정상 흐름     | `drawing.score.succeeded` (매 stroke), 캐시 hit/miss |
| `warn`       | 의심스럽지만 시스템 정상  | 4xx 외부 API, 정책 거부, slow 임계 초과, `*.skipped` |
| `error`      | 시스템/외부 의존 실패     | 5xx 외부 API, 복호화/저장 실패, 예기치 못한 예외     |

같은 이벤트라도 임계치에 따라 레벨만 올리는 패턴 OK (예: `drawing.score.succeeded`가 `durationMs >= SLOW_THRESHOLD`면 `warn`).

### 에러 로깅

```ts
this.logger.error(
  { event: "auth.login.toss_api_failed", statusCode: err.statusCode, err },
  `Toss API 오류 (HTTP ${err.statusCode})`,
);
throw new BadGatewayException("Toss API 오류가 발생했어요.");
```

- `err`는 객체 그대로 넘김 — pino의 `err` serializer가 stack까지 직렬화. string 변환 금지.
- 외부 의존 실패는 도메인 친화적 NestJS 예외로 변환해 throw.

### 메타 필드 권장

| 필드         | 용도                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| `userKey`    | 행위자 식별                                                             |
| `durationMs` | 외부 호출/계산 소요 시간                                                |
| `reason`     | 거부/실패 사유 (snake_case: `whitelist_miss`, `daily_cap`, `no_chance`) |
| `err`        | 에러 객체 그대로                                                        |
| `statusCode` | 외부 HTTP 호출 응답 코드                                                |

## 테스트

- Jest(ts-jest), `*.spec.ts`, `passWithNoTests` 활성. `describe`/`it` 설명은 **한국어**.
- **MikroORM 모킹 일원화**: `src/test-setup/setup-mikro-orm-mocks.ts`를 jest `setupFiles`에 등록 → 각 spec에서 `jest.mock("@mikro-orm/...")`를 반복할 필요 없음.
- Controller 레이어는 `Test.createTestingModule` + `useValue` 서비스 목 + supertest로 e2e 스모크(라우팅/상태코드). `app.useGlobalFilters(new ZodExceptionFilter())` 등록 **필수** — 없으면 Zod 검증 실패가 400 대신 500으로 떨어진다.
- `moduleNameMapper`: `@toss/shared`, `@davinci/similarity`.

## 환경변수

단일 소스는 `.env.example`. 동작에 영향을 주는 주요 변수:

| 변수                                                                                                                    | 설명                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `PORT`                                                                                                                  | 서버 포트. `.env.example`은 `3000` (client-toss Vite 프록시도 3000 가정). 미설정 시 코드 폴백은 `3001`    |
| `NODE_ENV`                                                                                                              | `production`이 아니면 부팅 시 마이그레이션 자동 실행 + MikroORM debug. `test`면 `allowGlobalContext` 활성 |
| `CORS_ORIGIN`                                                                                                           | 허용 오리진 (쉼표 구분)                                                                                   |
| `LOG_LEVEL`                                                                                                             | pino 로그 레벨                                                                                            |
| `MYSQL_HOST`·`MYSQL_PORT`·`MYSQL_USER`·`MYSQL_PASSWORD`·`MYSQL_DATABASE`                                                | MySQL 접속 정보                                                                                           |
| `DISABLE_PROMPT_CACHE`                                                                                                  | `"true"`면 `PromptService` 메모리 캐시 우회                                                               |
| `TOSS_API_BASE_URL`·`TOSS_API_KEY`·`TOSS_DECRYPT_KEY`·`TOSS_DECRYPT_AAD`·`TOSS_CLIENT_CERT_PATH`·`TOSS_CLIENT_KEY_PATH` | 토스 API 연동·페이로드 복호화·클라이언트 인증서                                                           |
| `JWT_SECRET`                                                                                                            | JWT 서명 키 (32자 이상)                                                                                   |
| `PROMOTION_CODE`                                                                                                        | 프로모션 코드                                                                                             |
| `SHARE_DAILY_CHARGE_LIMIT`                                                                                              | 공유 적립 일일 캡 (기본 5, KST 자정 리셋, contactsViral + share 폴백 합산. 광고는 캡 없음)                |
| `AD_GROUP_ID_WHITELIST`·`SHARE_MODULE_ID_WHITELIST`                                                                     | 콘솔에 등록한 광고 그룹 ID / 공유 리워드 모듈 ID 화이트리스트 (콤마 구분)                                 |
