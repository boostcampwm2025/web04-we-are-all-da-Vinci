import { expect, test } from "@playwright/test";
import {
  createRoomWith3Rounds,
  joinRoom,
  setupProfileInContext,
} from "./fixtures";

test.describe("게임 재시작", () => {
  // 3라운드 게임 전체 진행 + 재시작까지 충분한 시간
  test.setTimeout(300000);

  test("모든 라운드 완료 → 최종 결과 → 게임 재시작", async ({ browser }) => {
    const hostContext = await browser.newContext();
    await setupProfileInContext(hostContext);
    const hostPage = await hostContext.newPage();

    const guestContext = await browser.newContext();
    await setupProfileInContext(guestContext);
    const guestPage = await guestContext.newPage();

    try {
      await test.step("호스트가 3라운드 방을 생성하고 게스트가 입장한다", async () => {
        const roomId = await createRoomWith3Rounds(hostPage);
        await joinRoom(guestPage, roomId);
        await expect(
          hostPage.getByRole("button", { name: "시작" }),
        ).toBeEnabled({ timeout: 10000 });
      });

      await test.step("게임을 시작한다", async () => {
        await hostPage.getByRole("button", { name: "시작" }).click();
        await expect(
          hostPage.getByText(/기억하세요|그림을 그려주세요/),
        ).toBeVisible({ timeout: 15000 });
      });

      await test.step("게임이 끝날 때까지 대기한다 (다시하기 버튼 표시)", async () => {
        // GAME_END 화면에서 "다시하기" 버튼이 나타날 때까지 대기
        // 3라운드 × 45초 + 대기 = 약 150초 예상
        await expect(
          hostPage.getByRole("button", { name: "다시하기" }),
        ).toBeVisible({ timeout: 180000 });
      });

      await test.step("다시하기 버튼 클릭 후 대기실로 돌아간다", async () => {
        // 버튼이 활성화될 때까지 대기 (10초 후 활성화)
        await expect(
          hostPage.getByRole("button", { name: "다시하기" }),
        ).toBeEnabled({ timeout: 15000 });

        await hostPage.getByRole("button", { name: "다시하기" }).click();

        await expect(
          hostPage.getByRole("button", { name: "시작" }),
        ).toBeVisible({ timeout: 10000 });
      });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
