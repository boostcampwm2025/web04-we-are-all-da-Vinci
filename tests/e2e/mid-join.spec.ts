import { test, expect } from '@playwright/test';
import {
  createRoom,
  createRoomWith30sDrawing,
  joinRoom,
  setupProfileInContext,
} from './fixtures';

test.describe('게임 중간 입장', () => {
  test.setTimeout(180000);

  test('게임 중간 입장 → 대기 → 다음 라운드 참여', async ({ browser }) => {
    const hostContext = await browser.newContext();
    await setupProfileInContext(hostContext);
    const hostPage = await hostContext.newPage();

    const guest1Context = await browser.newContext();
    await setupProfileInContext(guest1Context);
    const guest1Page = await guest1Context.newPage();

    let roomId: string;

    try {
      await test.step('호스트가 방을 생성하고 게스트1이 입장한다', async () => {
        roomId = await createRoom(hostPage);
        await joinRoom(guest1Page, roomId);
        await hostPage.waitForTimeout(1000);
      });

      await test.step('게임을 시작한다', async () => {
        await hostPage.getByRole('button', { name: '게임 시작' }).click();
        await expect(hostPage.locator('canvas')).toBeVisible({ timeout: 30000 });
      });

      await test.step('게스트2가 게임 진행 중에 입장한다', async () => {
        const guest2Context = await browser.newContext();
        await setupProfileInContext(guest2Context);
        const guest2Page = await guest2Context.newPage();
        await joinRoom(guest2Page, roomId);

        await test.step('게스트2에게 대기 오버레이가 표시된다', async () => {
          await expect(guest2Page.getByText('게임 진행 중')).toBeVisible({
            timeout: 10000,
          });
          await expect(guest2Page.getByText('연습하기')).toBeVisible();
        });

        await test.step('다음 라운드/결과에서 오버레이가 사라진다', async () => {
          await expect(guest2Page.getByText('게임 진행 중')).not.toBeVisible({
            timeout: 60000,
          });
        });

        await guest2Context.close();
      });
    } finally {
      await hostContext.close();
      await guest1Context.close();
    }
  });

  test('게임 중간 입장 → 연습하기 버튼 클릭 → 연습 캔버스 표시', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext();
    await setupProfileInContext(hostContext);
    const hostPage = await hostContext.newPage();

    const guest1Context = await browser.newContext();
    await setupProfileInContext(guest1Context);
    const guest1Page = await guest1Context.newPage();

    let roomId: string;

    try {
      await test.step('호스트가 방을 생성하고 게스트1이 입장 후 게임 시작', async () => {
        // 30초 드로잉 시간으로 방 생성 (연습하기 테스트 시간 확보)
        roomId = await createRoomWith30sDrawing(hostPage);
        await joinRoom(guest1Page, roomId);
        await hostPage.waitForTimeout(1000);
        await hostPage.getByRole('button', { name: '게임 시작' }).click();
        await expect(hostPage.locator('canvas')).toBeVisible({ timeout: 30000 });
      });

      await test.step('게스트2가 게임 진행 중에 입장한다', async () => {
        const guest2Context = await browser.newContext();
        await setupProfileInContext(guest2Context);
        const guest2Page = await guest2Context.newPage();
        await joinRoom(guest2Page, roomId);

        await test.step('대기 오버레이가 표시된다', async () => {
          await expect(guest2Page.getByText('게임 진행 중')).toBeVisible({
            timeout: 10000,
          });
        });

        await test.step('연습하기 버튼을 클릭하면 연습 캔버스가 표시된다', async () => {
          await guest2Page.getByRole('button', { name: '연습하기' }).click();
          // 왼쪽: prompt 캔버스, 오른쪽: 그리기 캔버스
          await expect(guest2Page.locator('canvas').last()).toBeVisible({
            timeout: 5000,
          });
        });

        await test.step('연습 캔버스에서 그림을 그릴 수 있다', async () => {
          const canvas = guest2Page.locator('canvas').last();
          const box = await canvas.boundingBox();
          if (box) {
            await guest2Page.mouse.move(
              box.x + box.width / 4,
              box.y + box.height / 4
            );
            await guest2Page.mouse.down();
            await guest2Page.mouse.move(
              box.x + (box.width * 3) / 4,
              box.y + (box.height * 3) / 4
            );
            await guest2Page.mouse.up();
          }
        });

        await guest2Context.close();
      });
    } finally {
      await hostContext.close();
      await guest1Context.close();
    }
  });

  test('게임 중간 입장 → 나가기 버튼 클릭 → 메인 화면으로 이동', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext();
    await setupProfileInContext(hostContext);
    const hostPage = await hostContext.newPage();

    const guest1Context = await browser.newContext();
    await setupProfileInContext(guest1Context);
    const guest1Page = await guest1Context.newPage();

    let roomId: string;

    try {
      await test.step('호스트가 방을 생성하고 게스트1이 입장 후 게임 시작', async () => {
        roomId = await createRoom(hostPage);
        await joinRoom(guest1Page, roomId);
        await hostPage.waitForTimeout(1000);
        await hostPage.getByRole('button', { name: '게임 시작' }).click();
        await expect(hostPage.locator('canvas')).toBeVisible({ timeout: 30000 });
      });

      await test.step('게스트2가 게임 진행 중에 입장한다', async () => {
        const guest2Context = await browser.newContext();
        await setupProfileInContext(guest2Context);
        const guest2Page = await guest2Context.newPage();
        await joinRoom(guest2Page, roomId);

        await test.step('대기 오버레이가 표시된다', async () => {
          await expect(guest2Page.getByText('게임 진행 중')).toBeVisible({
            timeout: 10000,
          });
        });

        await test.step('나가기 버튼을 클릭하면 메인 화면으로 이동한다', async () => {
          await guest2Page.getByRole('button', { name: '나가기' }).click();
          await expect(guest2Page).toHaveURL(/\/$/, { timeout: 10000 });
          await expect(guest2Page.getByText('방 만들기')).toBeVisible();
        });

        await guest2Context.close();
      });
    } finally {
      await hostContext.close();
      await guest1Context.close();
    }
  });
});
