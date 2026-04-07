# Server-Toss (NestJS REST API) - CLAUDE.md

> 이 워크스페이스는 기존 게임 서버(server/)와 독립적입니다. 루트 CLAUDE.md는 모노레포 인프라와 Git 워크플로우만 참고하세요.

## Overview

- NestJS 11.x REST-only 백엔드 (Apps-in-Toss 미니앱용)
- 현재 최소 스캐폴드: HealthModule(GET /health)만 존재
- **WebSocket, Redis, Socket.io, 스케줄링 없음**

## Tech Stack

| 항목 | 값 |
|------|-----|
| Framework | NestJS ^11.1.17 |
| Logging | nestjs-pino (구조화 JSON 로그) |
| Validation | Zod ^4.3.6 |
| Test | Jest ^30.0.0 (ts-jest) |
| Target | ES2023, CommonJS |

## Development Commands

```bash
# Development mode with watch
pnpm start:dev

# Build for production
pnpm build

# Run production build
pnpm start:prod

# Run tests
pnpm test

# Lint
pnpm lint

# Format
pnpm format
```

## Path Aliases

- `src/*` → `src/*`
- `@toss/shared` → `../packages/toss-shared/dist` (공유 타입/스키마)
- `@davinci/similarity` → `../packages/similarity/dist` (이미지 유사도)
- 런타임 해석: tsconfig-paths (start 스크립트에서 사용)

## Current Architecture

```
src/
├── main.ts          - 부트스트랩 (CORS, pino logger)
├── app.module.ts    - 루트 모듈 (HealthModule + ConfigModule + LoggerModule)
└── health/
    ├── health.module.ts
    └── health.controller.ts  - GET /health → { status: "ok" }
```

### Conventions
- CORS: `CORS_ORIGIN` 환경변수 (쉼표 구분)
- 기본 포트: 3001
- 로깅: nestjs-pino (구조화 JSON)
- 기존 게임 서버의 모듈(Game, Chat, Round 등) 없음

## Testing

- Jest with ts-jest transform
- Test file pattern: `*.spec.ts`
- `passWithNoTests` enabled
- moduleNameMapper: `@toss/shared`, `@davinci/similarity` 경로 매핑

## Environment Configuration

- `PORT` - 서버 포트 (default: 3001)
- `CORS_ORIGIN` - 허용 오리진 (쉼표 구분)
