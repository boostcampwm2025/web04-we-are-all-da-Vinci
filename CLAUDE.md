# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**우리 모두 다빈치 (We Are All Da Vinci)** - A real-time multiplayer drawing memory game where players compete to recreate drawings as accurately as possible from memory.

- **Architecture**: Monorepo with pnpm workspaces
- **Package Manager**: pnpm@10.20.0

### Workspaces

| Workspace      | Description                                           | Details                     |
| -------------- | ----------------------------------------------------- | --------------------------- |
| `client/`      | React 19 + Vite + TailwindCSS (FSD) — 게임 클라이언트 | See `client/CLAUDE.md`      |
| `server/`      | NestJS + Socket.io + Redis — 게임 서버                | See `server/CLAUDE.md`      |
| `client-toss/` | Apps-in-Toss WebView 미니앱 (Granite + TDS)           | See `client-toss/CLAUDE.md` |
| `server-toss/` | NestJS REST API — 앱인토스 서버                       | See `server-toss/CLAUDE.md` |
| `packages/`    | Shared packages (shared, toss-shared, similarity)     | —                           |

### Two independent products in one monorepo

The repo holds **two separate apps that do not share runtime code** — read the matching sub-CLAUDE.md before working in either:

- **The game** (`client/` + `server/`): real-time multiplayer over **Socket.io + Redis**. The "Cross-Cutting Patterns" below (WebSocket flow, constants sync, server-driven timer) apply **only here**.
- **The Apps-in-Toss mini-app** (`client-toss/` + `server-toss/`): a **non-game** WebView mini-app talking to a **REST API + MySQL (MikroORM)**. No WebSocket/Redis. Sandbox-only verification (see `client-toss/CLAUDE.md`). Do **not** apply the game's patterns here.

Shared packages split along the same line: `shared` + `similarity` → game; `toss-shared` → toss app; `similarity` is used by both. `pnpm build:packages` builds all three and is required before the first run.

## Development Commands

### Infrastructure

Local services live in `infra/local/compose.yaml`. There is **no `infra:up`/`infra:down`** — each service is started/stopped by name:

```bash
# Redis — required by server/ (game)
pnpm infra:redis:up
pnpm infra:redis:down

# MySQL — required by server-toss/ (Apps-in-Toss API; MikroORM)
pnpm infra:mysql:up
pnpm infra:mysql:down
```

### Root-level shortcuts

```bash
# Start client dev server
pnpm dev:client

# Start server dev server
pnpm dev:server

# Start client-toss dev server
pnpm dev:client-toss

# Start server-toss dev server
pnpm dev:server-toss

# Build shared packages (required before first run)
pnpm build:packages

# E2E tests (Playwright)
pnpm test:e2e

# Performance tests (Artillery)
pnpm perf:single
pnpm perf:multi
```

## Cross-Cutting Patterns (client/ + server/)

### WebSocket Communication Pattern

**Client Socket Management:**

- Socket instance is a singleton managed by `getSocket()` from `@/shared/api/socket`
- Configuration: WebSocket transport only, manual connection control (`autoConnect: false`)
- Connect/disconnect via `useGameSocket` hook in Game page
- Hook handles all event listeners and cleanup automatically on unmount
- Nickname stored in localStorage, retrieved on connection
- `mySocketId` is stored in Zustand gameStore (set on connect, cleared on disconnect) — use `useGameStore(state => state.mySocketId)` instead of `getSocket().id`
- Pure handler functions (`buildRankings`, `processRoomMetadata`) are extracted to `features/socket/lib/socketHandlers.ts` for testability

**Connection Flow:**

1. Client connects to Socket.io server (CORS configured via `CORS_ORIGIN` env var)
2. Client emits `user:join` with roomId and nickname (from localStorage)
3. Server validates room (throws `WebsocketException` if not found or full)
4. If room phase is DRAWING, player added to waitlist → emit `user:waitlist`
5. Otherwise, player added to room → Socket joins room → Broadcast `room:metadata`
6. On disconnect, `GameService.leaveRoom()` removes player and reassigns host if needed

**Game Flow:**

1. Host changes settings → `room:settings` → Server updates Redis → Broadcast `room:metadata`
2. Host starts game → `room:start` → Server transitions phase to PROMPT
3. Server emits `room:prompt` with image → Phase transitions to DRAWING
4. Players draw → `user:drawing` → Server collects submissions
5. Timer expires → Server calculates similarity → `room:round_end` with results
6. Repeat for totalRounds → Final `room:game_end` with leaderboard

### Constants Synchronization

- **CRITICAL**: Client and server constants must stay in sync
- Client constants: `client/src/shared/config/socketEvents` and `client/src/shared/config/gamePhase`
- Server constants: `server/src/common/constants/index.ts`
- Any new event or phase must be added to both locations
- Client imports: `CLIENT_EVENTS`, `SERVER_EVENTS`, `GAME_PHASE` from `@/shared/config`
- Server imports: `ClientEvents`, `ServerEvents`, `GamePhase` from common constants

### Timer Pattern

- **Server payload**: `room:timer` event always sends object `{ timeLeft: number }`, never raw number
- **Client listener**: Must destructure payload: `socket.on(CLIENT_EVENTS.ROOM_TIMER, ({ timeLeft }) => setTimer(timeLeft))`
- **Widget usage**: Import `<Timer />` from `@/entities/timer` without props
- **No local timers**: Widgets must NEVER use `useState` for countdown or call `navigate()` based on timer
- **Phase transitions**: Controlled exclusively by server → widgets react to `phase` changes from store
- **Performance**: Timer component subscribes directly to store to prevent widget re-renders
- **Visual effects**: Timer shows urgency (animations + red color) when `timeLeft <= 5`

### Testing Philosophy

- Jest/Vitest configured with `passWithNoTests: true` to allow incremental test development
- Test files use `*.spec.ts` pattern for server, `*.test.ts(x)` for client
- Coverage collection enabled for all source files
- All test descriptions must be in Korean — both `describe` and `it`. Do not use component/class/hook names or HTTP paths as the suite title. ✗ `describe('StreakStatsCard')`, `describe('POST /attendance/check-in')` → ✓ `describe('연속 출석 통계 카드')`, `describe('출석 체크인')`. AI agents must convert any English suite title to a Korean description in new/edited specs.

## CI/CD

### CI 파이프라인 (ci.yml)

`dorny/paths-filter`로 변경된 워크스페이스만 CI를 실행한다.

| 변경 대상                 | 실행되는 Job                                                     |
| ------------------------- | ---------------------------------------------------------------- |
| `client/**`               | Client (lint, format, test, build) + Bundle Size (Client)        |
| `server/**`               | Server (lint, format, test, build)                               |
| `client-toss/**`          | Client-Toss (lint, format, test, QA, build) + Bundle Size (Toss) |
| `server-toss/**`          | Server-Toss (lint, format, test, build)                          |
| `packages/shared/**`      | Client, Server, Bundle Size (Client)                             |
| `packages/similarity/**`  | Client, Client-Toss, Server-Toss, Bundle Size (Client + Toss)    |
| `packages/toss-shared/**` | Client-Toss, Server-Toss, Bundle Size (Toss)                     |
| push to main              | 모든 워크스페이스 (Bundle Size 제외)                             |

- shared 패키지 빌드: `pnpm build:packages`로 전체 빌드 (shared + similarity + toss-shared)
- client-toss QA: `pnpm qa:ci`로 앱인토스 심사 기준 자동 검증 (granite config, TDS, UX writing, 다크패턴, 광고, 외부 링크, 번들 사이즈)

### 기타 워크플로우

- `chromatic.yml`: Storybook 비주얼 리그레션 (develop PR, client 변경 시)
- `lighthouse-ci.yml`: Client 성능 점수 (PR, client 변경 시)
- `deploy-backend.yml`: Blue-Green 배포 (self-hosted, main push)
- `deploy-toss-backend.yml`: Toss 서버 배포 (self-hosted, main push)

## Git Workflow

Pre-commit hooks (managed by Lefthook):

- Auto-fixes ESLint issues on staged files
- Auto-formats with Prettier on staged files
- Runs separately for client and server workspaces

**Commit Message Format** (enforced by Lefthook):

- Format: `type(scope): message` or `type: message`
- Scope is optional (fe, be, etc.)
- Allowed types: `feat`, `fix`, `style`, `design`, `refactor`, `docs`, `chore`, `lint`, `deploy`, `test`, `rename`, `remove`, `type`, `comment`, `build`, `ci`, `perf`, `!HOTFIX`, `!BREAKING CHANGE`
- Example: `feat(fe): 회원가입 이메일 인증 추가`

Branch naming: `feat/#<issue-number>/<fe|be>/<description>` (e.g., `feat/#101/fe/game_end/round_end`)
Main branch: `main`
