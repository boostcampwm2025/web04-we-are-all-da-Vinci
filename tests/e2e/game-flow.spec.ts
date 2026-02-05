import { expect, test } from "@playwright/test";
import { cleanupContexts, createRoomWithPlayers } from "./fixtures";

test.describe("게임 핵심 플로우", () => {
  test.setTimeout(120000);

  test("방 생성 → 게스트 입장 → 시작 → 1라운드 완주", async ({ browser }) => {
    const ctx = await createRoomWithPlayers(browser);

    try {
      await test.step("대기실에서 호스트/게스트 모두 시작 버튼이 보인다", async () => {
        await expect(ctx.hostPage.getByText("시작")).toBeVisible();
        await expect(ctx.guestPage.getByText("시작")).toBeVisible();
      });

      await test.step("호스트만 시작 버튼이 활성화된다", async () => {
        await expect(
          ctx.hostPage.getByRole("button", { name: "시작" }),
        ).toBeEnabled();
        await expect(
          ctx.guestPage.getByRole("button", { name: "시작" }),
        ).toBeDisabled();
      });

      await test.step("시작 후 PROMPT 또는 DRAWING 화면으로 전환된다", async () => {
        await ctx.hostPage.getByRole("button", { name: "시작" }).click();

        await expect(
          ctx.hostPage.getByText(/기억하세요|그림을 그려주세요/),
        ).toBeVisible({ timeout: 15000 });
        await expect(
          ctx.guestPage.getByText(/기억하세요|그림을 그려주세요/),
        ).toBeVisible({ timeout: 15000 });
      });

      await test.step("DRAWING 화면에서 캔버스가 표시된다", async () => {
        await expect(ctx.hostPage.locator("canvas")).toBeVisible({
          timeout: 30000,
        });
        await expect(ctx.guestPage.locator("canvas")).toBeVisible({
          timeout: 30000,
        });
      });

      await test.step("캔버스에 그림을 그린다", async () => {
        const hostCanvas = ctx.hostPage.locator("canvas");
        const guestCanvas = ctx.guestPage.locator("canvas");

        // 호스트가 그림 그리기 (대각선 ↘)
        const hostBox = await hostCanvas.boundingBox();
        if (hostBox) {
          await ctx.hostPage.mouse.move(
            hostBox.x + hostBox.width * 0.2,
            hostBox.y + hostBox.height * 0.2,
          );
          await ctx.hostPage.mouse.down();
          await ctx.hostPage.mouse.move(
            hostBox.x + hostBox.width * 0.8,
            hostBox.y + hostBox.height * 0.8,
          );
          await ctx.hostPage.mouse.up();
        }

        // 게스트가 그림 그리기 (원형)
        const guestBox = await guestCanvas.boundingBox();
        if (guestBox) {
          const centerX = guestBox.x + guestBox.width / 2;
          const centerY = guestBox.y + guestBox.height / 2;
          const radius = Math.min(guestBox.width, guestBox.height) * 0.3;

          await ctx.guestPage.mouse.move(centerX + radius, centerY);
          await ctx.guestPage.mouse.down();
          // 원 그리기 (8개 점으로 근사)
          for (let i = 1; i <= 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            await ctx.guestPage.mouse.move(
              centerX + radius * Math.cos(angle),
              centerY + radius * Math.sin(angle),
            );
          }
          await ctx.guestPage.mouse.up();
        }

        // 잠시 대기 (서버에 드로잉 전송)
        await ctx.hostPage.waitForTimeout(500);
      });

      await test.step("라운드 종료 후 결과 화면이 표시된다", async () => {
        await expect(ctx.hostPage.getByText(/순위|결과|게임/)).toBeVisible({
          timeout: 60000,
        });
      });
    } finally {
      await cleanupContexts(ctx);
    }
  });
});
