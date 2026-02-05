import { expect, test } from '@playwright/test';
import { createRoom, setupProfileInContext } from './fixtures';

test.describe('초대 링크', () => {
  test.setTimeout(60000);

  test('초대 링크로 방 입장', async ({ browser }) => {
    const hostContext = await browser.newContext();
    await setupProfileInContext(hostContext);
    const hostPage = await hostContext.newPage();

    const guestContext = await browser.newContext();
    await setupProfileInContext(guestContext);
    const guestPage = await guestContext.newPage();

    try {
      await test.step('호스트가 방을 생성한다', async () => {
        const roomId = await createRoom(hostPage);

        await test.step('대기실 URL에 roomId가 포함된다', async () => {
          await expect(hostPage).toHaveURL(/\/game\/[a-zA-Z0-9-]+/);
        });

        await test.step('게스트가 URL을 통해 직접 방에 입장한다', async () => {
          const inviteUrl = hostPage.url();
          await guestPage.goto(inviteUrl);
        });

        await test.step('게스트가 대기실에 입장한다', async () => {
          await expect(guestPage.getByText('시작')).toBeVisible({ timeout: 10000 });
        });

        await test.step('호스트 화면에 게스트가 표시된다', async () => {
          // 인원 수가 2명으로 표시되는지 확인
          await expect(hostPage.getByText(/2/)).toBeVisible({ timeout: 5000 });
        });
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
