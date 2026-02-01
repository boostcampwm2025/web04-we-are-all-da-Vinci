import { Browser, Page, BrowserContext } from '@playwright/test';

export interface GameContext {
  hostContext: BrowserContext;
  hostPage: Page;
  guestContext: BrowserContext;
  guestPage: Page;
  roomId: string;
}

/**
 * 브라우저 컨텍스트에 프로필 데이터를 미리 설정
 * 페이지 로드 전에 호출해야 함
 * 각 컨텍스트마다 고유한 profileId를 생성하여 중복 세션 방지
 */
export async function setupProfileInContext(context: BrowserContext, nickname = 'TestUser') {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await context.addInitScript(({ nickname, uniqueId }) => {
    localStorage.setItem('nickname', nickname);
    localStorage.setItem('profileId', uniqueId);
  }, { nickname, uniqueId });
}

/**
 * 호스트가 방을 생성하고 대기실로 이동
 * 주의: 이 함수 호출 전에 setupProfileInContext()로 프로필 설정 필요
 */
export async function createRoom(page: Page): Promise<string> {
  await page.goto('/');

  // 방 만들기 버튼 클릭
  await page.getByRole('button', { name: '방 만들기' }).click();

  // 방 설정 모달에서 완료 클릭 (BaseModal은 role="dialog"가 없으므로 텍스트로 찾기)
  const modalTitle = page.getByText('방 설정', { exact: true });
  await modalTitle.waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '완료' }).click();

  // 대기실 URL에서 roomId 추출
  await page.waitForURL(/\/game\/[a-zA-Z0-9-]+/);
  const url = page.url();
  const roomId = url.split('/game/')[1];

  return roomId;
}

/**
 * 3라운드 방 생성 (테스트 시간 단축용)
 */
export async function createRoomWith3Rounds(page: Page): Promise<string> {
  await page.goto('/');

  await page.getByRole('button', { name: '방 만들기' }).click();

  const modalTitle = page.getByText('방 설정', { exact: true });
  await modalTitle.waitFor({ state: 'visible' });

  // 3라운드 선택 (exact: true로 "30s"와 구분)
  await page.getByRole('button', { name: '3', exact: true }).click();

  await page.getByRole('button', { name: '완료' }).click();

  await page.waitForURL(/\/game\/[a-zA-Z0-9-]+/);
  const url = page.url();
  const roomId = url.split('/game/')[1];

  return roomId;
}

/**
 * 30초 드로잉 시간 방 생성 (연습하기 테스트용)
 */
export async function createRoomWith30sDrawing(page: Page): Promise<string> {
  await page.goto('/');

  await page.getByRole('button', { name: '방 만들기' }).click();

  const modalTitle = page.getByText('방 설정', { exact: true });
  await modalTitle.waitFor({ state: 'visible' });

  // 30초 선택
  await page.getByRole('button', { name: '30s' }).click();

  await page.getByRole('button', { name: '완료' }).click();

  await page.waitForURL(/\/game\/[a-zA-Z0-9-]+/);
  const url = page.url();
  const roomId = url.split('/game/')[1];

  return roomId;
}

/**
 * 게스트가 방에 입장
 * 주의: 이 함수 호출 전에 setupProfileInContext()로 프로필 설정 필요
 */
export async function joinRoom(page: Page, roomId: string) {
  await page.goto(`/game/${roomId}`);
}

/**
 * 호스트 + 게스트 2명이 대기실에 있는 상태까지 셋업
 */
export async function createRoomWithPlayers(
  browser: Browser
): Promise<GameContext> {
  // 호스트 브라우저 컨텍스트
  const hostContext = await browser.newContext();
  await setupProfileInContext(hostContext, 'Host');
  const hostPage = await hostContext.newPage();

  // 호스트: 방 생성
  const roomId = await createRoom(hostPage);

  // 게스트 브라우저 컨텍스트
  const guestContext = await browser.newContext();
  await setupProfileInContext(guestContext, 'Guest');
  const guestPage = await guestContext.newPage();

  // 게스트: 방 입장
  await joinRoom(guestPage, roomId);

  // 호스트 페이지에서 게스트가 보일 때까지 대기
  await hostPage.waitForTimeout(1000);

  return {
    hostContext,
    hostPage,
    guestContext,
    guestPage,
    roomId,
  };
}

/**
 * 컨텍스트 정리
 */
export async function cleanupContexts(ctx: GameContext) {
  await ctx.hostContext.close();
  await ctx.guestContext.close();
}
