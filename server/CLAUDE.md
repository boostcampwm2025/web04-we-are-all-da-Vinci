# Server (NestJS) - CLAUDE.md

> 이 파일은 루트 CLAUDE.md를 보완합니다. 인프라 설정, WebSocket 패턴, 상수 동기화, Git 워크플로우는 루트를 참고하세요.

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

# Run specific test file
pnpm test -- path/to/test.spec.ts

# Test with coverage
pnpm test:cov

# Run e2e tests
pnpm test:e2e

# Lint and fix
pnpm lint

# Format code
pnpm format
```

## Backend Structure

NestJS modular architecture with Socket.io for real-time communication:

**Core Modules:**
- **Game Module** (`src/game/`) - Room creation and management
  - REST: `POST /room` creates a new game room with 8-character UUID
  - WebSocket events: `user:join`, `room:settings`, `room:start`
  - `GameService.joinRoom()`: Validates room, adds player, handles waitlist for DRAWING phase
  - `GameService.leaveRoom()`: Removes player, reassigns host if needed
  - `GameGateway.broadcastMetadata()`: Broadcasts room state to all players
  - `GameGateway` uses `@UseFilters(WebsocketExceptionFilter)` for error handling

- **Play Module** (`src/play/`) - In-game actions
  - WebSocket events: `user:score`, `user:drawing`
  - Handles drawing submissions and score updates

- **Chat Module** (`src/chat/`) - Real-time in-game chat
  - WebSocket events: `chat:message` (client→server), `chat:broadcast`, `chat:history`, `chat:error` (server→client)
  - `ChatService.sendMessage()`: Validates message length (max 50 chars), checks rate limits, broadcasts to room
  - `ChatService.getHistory()`: Returns previous 50 messages for new joiners
  - System messages for join/leave/kick/host_change events
  - Rate limiting: 8 messages per 5 seconds (short-term), 30 messages per 30 seconds (long-term)
  - `ChatCacheService`: Redis List at `chat:{roomId}` for message history, rate limit keys at `ratelimit:chat:{window}:{socketId}`

- **Round Module** (`src/round/`) - Round lifecycle and phase transitions
  - `RoundGateway.handleDrawingSubmit()`: Manages phase transitions after drawing submission
  - Handles round-end results and game-end logic
  - Coordinates with TimerService for phase timing

- **Timer Module** (`src/timer/`) - Server-side timer management
  - `TimerService`: Global 1-second interval ticker, manages all active room timers
  - `TimerCacheService`: Redis-backed timer storage (Hash at `timer:{roomId}`)
  - `TimerGateway`: Broadcasts `ROOM_TIMER` events with `{ timeLeft }` payload
  - All timers are centralized in Redis for multi-instance server support

- **Lifecycle Module** (`src/lifecycle/`) - Game lifecycle event handling

- **Prompt Module** (`src/prompt/`) - Prompt image management

- **Metric Module** (`src/metric/`) - Performance metrics and monitoring

- **Health Module** (`src/health/`) - Health check endpoint

- **Redis Module** (`src/redis/`) - Caching layer with multiple services:
  - `GameRoomCacheService`: Room state persistence (Hash at `room:{roomId}:info`, List at `room:{roomId}:players`)
  - `PlayerCacheService`: Socket-to-room mapping (String at `player:{socketId}`)
  - `WaitlistCacheService`: Mid-game join queue (List at `waiting:{roomId}`)
  - `LeaderboardCacheService`: Real-time score tracking (Sorted Set at `leaderboard:{roomId}`)
  - `TimerCacheService`: Timer state storage (Hash at `timer:{roomId}`)
  - `GameProgressCacheService`: Round results and drawing data (Hash at `progress:{roomId}:{round}`)
  - `StandingsCacheService`: Cumulative standings (Sorted Set at `final:{roomId}`)
  - `ChatCacheService`: Chat message history (List at `chat:{roomId}`) and rate limiting
  - Uses `active:rooms` Set to track active rooms

**Shared Constants** (`src/common/constants/`):
- `ServerEvents`: Client→Server WebSocket event names
  - `USER_JOIN`, `USER_SCORE`, `USER_DRAWING`, `USER_KICK`, `ROOM_SETTINGS`, `ROOM_START`, `ROOM_RESTART`, `CHAT_MESSAGE`, `USER_PRACTICE`
- `ClientEvents`: Server→Client WebSocket event names
  - `ROOM_METADATA`, `ROOM_LEADERBOARD`, `ROOM_TIMER`, `ROOM_ROUND_REPLAY`, `ROOM_ROUND_STANDING`, `ROOM_GAME_END`, `ROOM_PROMPT`, `ROOM_KICKED`
  - `USER_WAITLIST`: Emitted when player joins during DRAWING phase
  - `CHAT_BROADCAST`, `CHAT_HISTORY`, `CHAT_ERROR`: Chat-related events
  - `USER_PRACTICE_STARTED`: Practice mode started event
  - `ERROR`: WebSocket error events (handled by WebsocketExceptionFilter)
- `GamePhase`: WAITING → PROMPT → DRAWING → ROUND_REPLAY → ROUND_STANDING → GAME_END
- `ErrorCode`: Korean error messages for WebSocket exceptions (room not found, room full, player not host, chat rate limit exceeded, etc.)

**Note:** `GameGateway`, `PlayGateway` 등 여러 게이트웨이가 `@UseFilters(WebsocketExceptionFilter)`를 사용

**Type Definitions** (`src/common/types/`):
- `GameRoom`: Complete room state (roomId, players, phase, currentRound, settings)
- `Player`: Socket connection info (socketId, nickname, isHost)
- `Settings`: Game configuration (drawingTime, totalRounds, maxPlayer)
- `Stroke`: Drawing data structure with `points: [number[], number[]]` (x and y coordinates) and `color: [number, number, number]` (RGB values)

## Redis Data Schema

**Room State:**
```
Key: room:{roomId}:info
Type: Hash
TTL: 3600s
Fields: roomId, phase, currentRound, settings (JSON string)
```

**Player List (per room):**
```
Key: room:{roomId}:players
Type: List (rpush/lrange)
Value: JSON stringified Player objects
```

**Active Rooms Index:**
```
Key: active:rooms
Type: Set
Members: roomId strings
```

**Player-Room Mapping:**
```
Key: player:{socketId}
Type: String, TTL: 3600s
Value: roomId
```

**Join Waitlist (for mid-game joins):**
```
Key: waiting:{roomId}
Type: List
Values: socketId strings (FIFO queue)
```

**Timer State:**
```
Key: timer:{roomId}
Type: Hash
Fields: roomId, timeLeft (number)
```

**Leaderboard:**
```
Key: leaderboard:{roomId}
Type: Sorted Set (zset)
Score: similarity (0-100), Value: socketId
```

**Chat Messages:**
```
Key: chat:{roomId}
Type: List, TTL: 3600s
Values: JSON stringified ChatMessage objects (max 50, LPUSH + LTRIM)
```

**Chat Rate Limiting:**
```
Key: ratelimit:chat:{short|long}:{socketId}
Type: String (counter), TTL: 5s (short) or 30s (long)
Value: message count
```

## Important Patterns

### Module Dependencies
- All game modules depend on Redis module for state persistence
- Common types/constants are shared across all modules
- WebSocket gateways are registered in their respective feature modules

### Error Handling
- NestJS exception filters handle HTTP errors
- WebSocket errors use `WebsocketExceptionFilter` which catches `WebsocketException` and emits `ClientEvents.ERROR` to client
- Throw `WebsocketException` in services for client-facing errors (e.g., room not found, room full)
- Redis connection failures are logged via nestjs-pino

### Testing Patterns
- Use `/* eslint-disable @typescript-eslint/unbound-method */` for Jest mock tests
- Create explicit mock types instead of `as any`:
  ```typescript
  const existingRoom: GameRoom = { /* full object */ };
  cacheService.getRoom.mockResolvedValueOnce(existingRoom);
  ```
- Test file pattern: `*.spec.ts`
- All test descriptions must be in Korean

## Environment Configuration (.env)

Required variables:
- `NODE_ENV` - development/production
- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - Comma-separated allowed origins
- `REDIS_HOST` - Redis server host
- `REDIS_PORT` - Redis server port
- `REDIS_PASSWORD` - Redis password (optional)

Optional timing overrides:
- `PROMPT_TIME` - Prompt viewing duration in seconds (default: 5)
- `DRAWING_END_DELAY` - Drawing end delay in ms (default: 1800)
- `ROUND_REPLAY_TIME` - Round replay duration in seconds (default: 15)
- `ROUND_STANDING_TIME` - Round standing duration in seconds (default: 10)
- `GAME_END_TIME` - Game end screen duration in seconds (default: 30)
