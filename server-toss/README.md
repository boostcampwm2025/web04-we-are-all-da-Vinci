# server-toss

Apps-in-Toss 미니앱용 NestJS REST API. 매 획 단위의 유사도 계산과 최종 제출 저장을 담당한다.

## 로컬 환경 설정

> [!INFO]
> 이 프로젝트는 pnpm과 MySQL을 사용합니다.

**MySQL이 없는 경우**

1. 프로젝트 루트로 이동합니다.
2. `pnpm infra:mysql:up` 명령으로 MySQL을 실행합니다.
3. `pnpm dev:server-toss`로 서버를 실행합니다.

**MySQL이 이미 실행 중인 경우**

1. `cp server-toss/.env.example .env`로 `server-toss/.env` 파일을 생성합니다.
2. 실행 중인 MySQL 설정에 맞게 값을 바꿉니다.
3. 프로젝트 루트에서 `pnpm dev:server-toss` 명령으로 서버를 실행합니다.

## 부팅 흐름

`src/main.ts`는 다음 순서로 초기화한다.

1. Nest 앱 생성 + `ZodExceptionFilter` 전역 등록 + CORS/Swagger(`/docs`) 세팅
2. 비-프로덕션에서 `MikroORM.migrator.up()` 자동 실행
3. `PromptSeedService.run()` — `prompts` / `daily_prompts`가 **둘 다 비어있을 때만** `data/promptStrokes.json`으로 시드 (SEED_START_DATE = 2026-04-01 KST, i번째 프롬프트 → 4/1 + i일)
4. `app.listen(PORT)`

## API

요청/응답 스키마 단일 소스는 `packages/toss-shared/src/schemas/drawing.schema.ts` 이다.

| Method | Path        | Request Body                       | Response (Success)                       | 에러                                   |
| ------ | ----------- | ---------------------------------- | ---------------------------------------- | -------------------------------------- |
| GET    | `/health`   | —                                  | `200 { status: "ok" }`                   | —                                      |
| GET    | `/prompt`   | —                                  | `200 { promptId, strokes }`              | `404 PROMPT_NOT_FOUND`                 |
| POST   | `/strokes`  | `{ strokes: Stroke[] }`            | `201 Similarity`                         | `400` (Zod), `404 PROMPT_NOT_FOUND`    |
| POST   | `/drawing` | `{ userKey: string, strokes: … }`  | `201 { drawingId, similarity }`          | `400` (Zod), `404 USER_NOT_FOUND`      |

### 타입

```ts
type Stroke = {
  points: [number[], number[]];          // [xs, ys]
  color: [number, number, number];       // RGB 0-255
};

type Similarity = {
  similarity: number;                     // 0~100
  strokeCountSimilarity: number;
  strokeMatchSimilarity: number;
  shapeSimilarity: number;
};
```

### 주요 설계

- **`promptId`는 서버가 결정한다.** `/strokes`는 클라에서 `promptId`를 받지 않고 서버가 오늘 날짜(KST)의 `daily_prompts`로 매칭 — 프롬프트 조작 방지.
- **`/strokes`는 DB에 저장하지 않는다.** 획마다 호출되므로 쓰기 부하를 피함.
- **`/drawing`는 유사도를 재계산해서 저장한다.** 클라가 보낸 유사도를 신뢰하지 않음.

### curl 예시

```sh
curl http://localhost:3001/prompt

curl -X POST http://localhost:3001/strokes \
  -H 'Content-Type: application/json' \
  -d '{"strokes":[{"points":[[10,20],[10,20]],"color":[0,0,0]}]}'

curl -X POST http://localhost:3001/drawing \
  -H 'Content-Type: application/json' \
  -d '{"userKey":"1234","strokes":[{"points":[[10,20],[10,20]],"color":[0,0,0]}]}'
```

Swagger UI: `http://localhost:3001/docs`

## 환경변수

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `PORT` | 서버 포트 | `3001` |
| `CORS_ORIGIN` | 허용 오리진 (쉼표 구분) | `*` |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL 접속 | `.env.example` 참조 |
| `DISABLE_PROMPT_CACHE` | `true`면 `PromptService`의 preprocessed 메모리 캐시를 우회 (벤치마크용) | unset |

## 테스트 / 벤치마크

```sh
pnpm --filter server-toss test

# POST /strokes 엔드-투-엔드 지연 (warmup 20, 샘플 200, 순차)
node server-toss/scripts/bench-strokes.mjs

# preprocessStrokes() 단독 비용
node server-toss/scripts/bench-preprocess.mjs
```

- `BENCH_WARMUP`, `BENCH_N`, `BENCH_URL` 환경변수로 조정 가능.
- 캐시 off/on 비교: `DISABLE_PROMPT_CACHE=true pnpm --filter server-toss start:dev`로 재기동 후 동일 벤치 실행.
