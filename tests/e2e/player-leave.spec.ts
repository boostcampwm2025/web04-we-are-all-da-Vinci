import { test, expect } from "@playwright/test";
import {
  createRoomWithPlayers,
  createRoom,
  joinRoom,
  setupProfileInContext,
} from "./fixtures";

test.describe("플레이어 이탈", () => {
  test.setTimeout(120000);

  test("게스트 이탈 → 게임 계속 진행", async ({ browser }) => {
    const hostContext = await browser.newContext();
    await setupProfileInContext(hostContext);
    const hostPage = await hostContext.newPage();

    const guest1Context = await browser.newContext();
    await setupProfileInContext(guest1Context);
    const guest1Page = await guest1Context.newPage();

    const guest2Context = await browser.newContext();
    await setupProfileInContext(guest2Context);
    const guest2Page = await guest2Context.newPage();

    try {
      await test.step("호스트와 게스트 2명이 방에 입장한다", async () => {
        const roomId = await createRoom(hostPage);
        await joinRoom(guest1Page, roomId);
        await joinRoom(guest2Page, roomId);
        await hostPage.waitForTimeout(1000);
      });

      await test.step("게임을 시작한다", async () => {
        await hostPage.getByRole("button", { name: "게임 시작" }).click();
      });

      await test.step("모든 플레이어에게 DRAWING 화면이 표시된다", async () => {
        await expect(hostPage.locator("canvas")).toBeVisible({
          timeout: 30000,
        });
        await expect(guest1Page.locator("canvas")).toBeVisible({
          timeout: 30000,
        });
        await expect(guest2Page.locator("canvas")).toBeVisible({
          timeout: 30000,
        });
      });

      await test.step("게스트1이 게임을 나간다", async () => {
        await guest1Context.close();
      });

      await test.step("남은 플레이어들은 게임을 계속 진행한다", async () => {
        await expect(hostPage.locator("canvas")).toBeVisible({
          timeout: 10000,
        });
        await expect(guest2Page.locator("canvas")).toBeVisible({
          timeout: 10000,
        });
      });
    } finally {
      await hostContext.close();
      await guest2Context.close();
    }
  });

  test("호스트 이탈 → 호스트 위임", async ({ browser }) => {
    const ctx = await createRoomWithPlayers(browser);

    try {
      await test.step("게임을 시작한다", async () => {
        await ctx.hostPage.getByRole("button", { name: "게임 시작" }).click();
      });

      await test.step("DRAWING 화면이 표시된다", async () => {
        await expect(ctx.hostPage.locator("canvas")).toBeVisible({
          timeout: 30000,
        });
      });

      await test.step("호스트가 게임을 나간다", async () => {
        await ctx.hostContext.close();
      });

      await test.step("게스트에게 게임이 계속 진행된다 (호스트 위임)", async () => {
        await expect(
          ctx.guestPage
            .locator("canvas")
            .or(ctx.guestPage.getByText(/라운드|결과|순위/)),
        ).toBeVisible({
          timeout: 30000,
        });
      });
    } finally {
      await ctx.guestContext.close();
    }
  });

  test("1명만 남으면 게임 종료", async ({ browser }) => {
    const ctx = await createRoomWithPlayers(browser);

    try {
      await test.step("게임을 시작한다", async () => {
        await ctx.hostPage.getByRole("button", { name: "게임 시작" }).click();
      });

      await test.step("DRAWING 화면이 표시된다", async () => {
        await expect(ctx.hostPage.locator("canvas")).toBeVisible({
          timeout: 30000,
        });
        await expect(ctx.guestPage.locator("canvas")).toBeVisible({
          timeout: 30000,
        });
      });

      await test.step("게스트가 게임을 나간다 (1명만 남음)", async () => {
        await ctx.guestContext.close();
      });

      await test.step("호스트에게 게임 종료 또는 대기실로 이동한다", async () => {
        // 1명만 남으면 게임이 종료되고 대기실로 돌아가거나 종료 메시지가 표시됨
        await expect(
          ctx.hostPage.getByText(/최종 결과|최종 순위|게임 시작|대기/),
        ).toBeVisible({ timeout: 30000 });
      });
    } finally {
      await ctx.hostContext.close();
    }
  });
});
