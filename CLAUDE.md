# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**우리 모두 다빈치 (We Are All Da Vinci)** - A real-time multiplayer drawing memory game where players compete to recreate drawings as accurately as possible from memory.

- **Architecture**: Monorepo with pnpm workspaces
- **Package Manager**: pnpm@10.20.0

### Workspaces

| Workspace | Description | Details |
|-----------|-------------|---------|
| `client/` | React 19 + Vite + TailwindCSS (FSD) — 게임 클라이언트 | See `client/CLAUDE.md` |
| `server/` | NestJS + Socket.io + Redis — 게임 서버 | See `server/CLAUDE.md` |
| `client-toss/` | Apps-in-Toss WebView 미니앱 (Granite + TDS) | See `client-toss/CLAUDE.md` |
| `server-toss/` | NestJS REST API — 앱인토스 서버 | See `server-toss/CLAUDE.md` |
| `packages/` | Shared packages (shared, toss-shared, similarity) | — |

## Development Commands

### Infrastructure
```bash
# Start local Redis (required before running server)
pnpm infra:up

# Stop local Redis
pnpm infra:down
```

### Root-level shortcuts
```bash
# Start client dev server
pnpm dev:client

# Start server dev server
pnpm dev:server
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
- All test descriptions must be in Korean (e.g., `describe('방 생성', () => ...)`)

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
