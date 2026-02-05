# Playwright 테스트 작성 가이드

## 1. 프로젝트 구조
```
tests/
├── e2e/                 # 게임 플로우 E2E 테스트
├── integration/         # 상태 전이 / 유틸 통합 테스트
├── fixtures/            # 테스트용 게임 설정, 플레이어 데이터
```
e2e는 "게임이 실제로 플레이 가능한가"만 검증한다.


## 2. 테스트 환경 설정

### Phase 시간 단축 (.env.test)
테스트 시 게임 phase 전환 시간을 단축하려면 `server/.env.test`를 사용한다.

```bash
# 테스트용 서버 실행
cd server && pnpm run start:test
```

| 환경변수 | 기본값 | 테스트값 | 설명 |
|----------|--------|----------|------|
| `PROMPT_TIME` | 5초 | 2초 | 제시어 확인 시간 |
| `DRAWING_END_DELAY` | 1800ms | 500ms | 그리기 종료 딜레이 |
| `ROUND_REPLAY_TIME` | 15초 | 3초 | 라운드 결과 리플레이 시간 |
| `ROUND_STANDING_TIME` | 10초 | 2초 | 라운드 순위 표시 시간 |
| `GAME_END_TIME` | 30초 | 3초 | 게임 종료 화면 시간 |

> ⚠️ `drawingTime`은 클라이언트에서 방 설정으로만 변경 가능

## 3. 테스트 파일 작성 규칙
### 파일 명명 규칙
- 테스트 파일은 .spec.ts 확장자 사용
- 파일명은 하이픈(-)으로 구분하고 테스트 대상을 명확히 표현
- 게임 시나리오 중심으로 명명
```
create-room.spec.ts
start-game.spec.ts
game-result.spec.ts
```

### 기본 테스트 구조
```ts
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/users';

test.describe('인증 및 로그인 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('유효한 자격증명으로 로그인 시 대시보드로 이동', async ({ page }) => {
    // 테스트 로직
  });
});
```

## 4. 테스트 케이스 작성 규칙
### 테스트 설명
```ts
// ❌ 잘못된 예
test('game test', async ({ page }) => {});

// ✅ 좋은 예
test('방장이 게임 시작 버튼을 누르면 진행 화면으로 전환된다', async ({ page }) => {});
```

### 테스트 단계 구분
```ts
test('게임 시작 플로우', async ({ page }) => {
  await test.step('방 생성 후 대기 화면 진입', async () => {
    await page.getByRole('button', { name: '방 만들기' }).click();
    await expect(page.getByText('대기 중')).toBeVisible();
  });

  await test.step('게임 시작 버튼 클릭', async () => {
    await page.getByRole('button', { name: '게임 시작' }).click();
    await expect(
      page.getByRole('heading', { name: '게임 진행' })
    ).toBeVisible();
  });
});
```
- 시간 기반 step ❌
- 상태 전이에 따른 UI 확인만 수행


## 5. Locator 전략
### 우선순위
```ts
// 1. Role과 접근성 속성 (최우선)
page.getByRole('button', { name: '게임 시작' })
page.getByRole('heading', { name: '게임 결과' })

// 2. 텍스트 및 기타
page.getByText('대기 중')
page.getByText('기억하세요')
page.getByText('그림을 그려주세요')

// 3. 테스트 ID (Role과 접근성 속성으로 선택이 어려운 경우에 사용)
// ⚠️ 사용 전 반드시 해당 요소에 data-testid 속성이 정의되어 있는지 확인
page.getByTestId('game-status')

// 안티 패턴
// ❌ 피해야 할 방식
page.locator('.login-btn')
page.locator('div > button')
```

## 6. 검증(Assertions) 가이드
```ts
// 요소 상태 검증
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByRole('alert')).toBeVisible();

// 텍스트 검증
await expect(page.getByRole('heading')).toHaveText('환영합니다');

// URL 검증
await expect(page).toHaveURL(/.*dashboard/);

// 다중 요소 검증
await expect(page.getByRole('listitem')).toHaveCount(3);
```


## 7. 테스트 데이터 관리

### 프로필 데이터 (localStorage)
우리 모두 다빈치는 로그인 없이 localStorage로 프로필을 관리한다.
테스트 시작 전 `addInitScript`로 프로필을 미리 설정해야 한다.

```ts
// tests/fixtures.ts
export async function setupProfileInContext(context: BrowserContext) {
  await context.addInitScript(() => {
    localStorage.setItem("nickname", "TestUser");
    localStorage.setItem("profileId", crypto.randomUUID());
  });
}
```

| localStorage 키 | 설명                   | 필수 |
| --------------- | ---------------------- | ---- |
| `nickname`      | 플레이어 닉네임        | ✅   |
| `profileId`     | 프로필 아바타 UUIDv4 | ✅   |

> ⚠️ **주의**: `nickname`과 `profileId`가 모두 설정되어야 프로필 설정 모달이 닫힌다.

### 멀티플레이어 테스트 설정
각 플레이어는 별도의 BrowserContext를 사용한다.

```ts
// 호스트 컨텍스트 생성
const hostContext = await browser.newContext();
await setupProfileInContext(hostContext);
const hostPage = await hostContext.newPage();

// 게스트 컨텍스트 생성 (독립된 세션)
const guestContext = await browser.newContext();
await setupProfileInContext(guestContext);
const guestPage = await guestContext.newPage();
```

### 방 생성/입장 헬퍼 함수
```ts
// 방 생성 (호스트)
const roomId = await createRoom(hostPage);

// 방 입장 (게스트)
await joinRoom(guestPage, roomId);
```