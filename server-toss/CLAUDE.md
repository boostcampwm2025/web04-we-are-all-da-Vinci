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

| Method | Path         | 역할                                                                     |
| ------ | ------------ | ------------------------------------------------------------------------ |
| GET    | `/health`    | 헬스체크                                                                  |
| GET    | `/prompt`    | 오늘의 기준 프롬프트 `{ promptId, strokes }` (KST 기준)                   |
| POST   | `/strokes`   | 실시간 유사도 계산. 매 획마다 호출, **DB 저장 없음**, `Similarity` 반환   |
| POST   | `/drawing`   | **최종 제출**. 유사도 재계산 후 `drawings` 테이블에 저장                  |

스키마는 `packages/toss-shared/src/schemas/drawing.schema.ts` 단일 소스. `/strokes`는 클라이언트가 `promptId`를 보내지 않는다 — 서버가 오늘 날짜의 `daily_prompts`로 자동 매칭해 프롬프트 조작을 차단.

## Architecture

```text
src/
├── main.ts                          - bootstrap: migration → seed → listen, 전역 ZodExceptionFilter
├── app.module.ts                    - 루트 모듈 (Mikro/Config/Logger + 도메인 모듈)
├── mikro-orm.config.ts              - forceUtcTimezone, allowGlobalContext
├── common/
│   ├── today.ts                     - getTodayKst(): KST 오늘 날짜의 UTC 자정 Date
│   ├── zod-validation.pipe.ts       - @Body() Zod 검증 파이프
│   ├── zod-exception.filter.ts      - ZodError → 400 + issues
│   └── base.entity.ts
├── health/                          - GET /health
├── modules/
│   ├── prompt/
│   │   ├── prompt.controller.ts     - GET /prompt
│   │   ├── prompt.service.ts        - daily_prompts 조회 + preprocessed 메모리 캐시
│   │   ├── prompt.seed.ts           - PromptSeedService.run(): 빈 DB에만 시드
│   │   ├── prompt.entity.ts
│   │   └── daily-prompt.entity.ts
│   ├── drawing/
│   │   ├── drawing.controller.ts    - POST /strokes, POST /drawing
│   │   ├── drawing.service.ts       - scoreStrokes(), submitDrawing()
│   │   └── drawing.entity.ts
│   ├── user/                        - user.entity, user.repository
│   ├── point/, ad/, ranking/        - (엔티티만, 이번 범위 외)
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

- **KST**: `common/today.ts`의 `getTodayKst()`로 통일. 컨트롤러/서비스가 직접 `new Date()`로 날짜 결정하지 말 것.
- **MikroORM v7**: `persistAndFlush` 없음 → `em.persist(e); await em.flush()`. 전역 EM 사용 시 `em.fork()` 또는 `allowGlobalContext: true`.
- **Zod 검증**: 컨트롤러에서 `@Body(new ZodValidationPipe(Schema))` — 파싱 실패는 `ZodExceptionFilter`가 400으로 변환.
- **유사도 재계산**: `POST /drawing`는 클라 값을 저장하지 않고 서버에서 다시 계산한 값을 저장.
- **`promptId` 전송 금지**: 클라는 보내지 않고, 서버가 오늘 날짜로 매칭.
- **Swagger**: 모든 컨트롤러에 `@ApiTags`, `@ApiOperation`, `@ApiResponse` 적용. `/docs`에서 확인 가능. `@ApiBody`는 Zod 스키마를 JSON Schema로 수동 기술 (Zod → OpenAPI 자동 변환 미사용).

## Testing

- Jest (ts-jest), `*.spec.ts`, `passWithNoTests` 활성
- `describe`/`it` **한국어** (루트 CLAUDE.md 규약)
- **MikroORM 모킹 일원화**: `src/test-setup/setup-mikro-orm-mocks.ts`를 jest `setupFiles`에 등록 → 각 spec에서 `jest.mock("@mikro-orm/...")` 반복 불필요
- Controller 레이어는 `Test.createTestingModule` + `useValue` 서비스 목 + supertest로 e2e 스모크(라우팅/상태코드)
- `moduleNameMapper`: `@toss/shared`, `@davinci/similarity`

## Environment Configuration

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `PORT` | 서버 포트 | 3001 |
| `CORS_ORIGIN` | 허용 오리진 (쉼표 구분) | `*` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL 접속 | `.env.example` 참조 |
| `DISABLE_PROMPT_CACHE` | `true` 설정 시 `PromptService` 메모리 캐시 우회 (벤치용) | unset |

## Benchmarks

- `scripts/bench-strokes.mjs` — `POST /strokes` 엔드-투-엔드 지연 (warmup/샘플 환경변수: `BENCH_WARMUP`, `BENCH_N`, `BENCH_URL`)
- `scripts/bench-preprocess.mjs` — `preprocessStrokes()` 단독 비용
- 결과/판단 기록: `docs/performance/similarity-cache.md`