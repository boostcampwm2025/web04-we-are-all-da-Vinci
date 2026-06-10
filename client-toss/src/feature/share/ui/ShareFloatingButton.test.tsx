/// <reference types="@testing-library/jest-dom/vitest" />
import { PlayChanceProvider } from "@/feature/playChance";
import { serverTossApi } from "@/shared/api";
import { contactsViral } from "@apps-in-toss/web-framework";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ShareFloatingButton from "./ShareFloatingButton";

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    getMyChance: vi.fn(),
    getMyRanking: vi.fn(),
    chargeChanceByShare: vi.fn(),
  },
  RequestError: class RequestError extends Error {},
  getAnalyticsInstance: vi.fn().mockReturnValue(null),
}));

const mockedApi = serverTossApi as unknown as { getMyChance: Mock };
const mockedContactsViral = contactsViral as unknown as { isSupported: Mock };

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PlayChanceProvider>
        <ShareFloatingButton />
      </PlayChanceProvider>
    </MemoryRouter>,
  );

describe("공유 플로팅 버튼", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getMyChance.mockResolvedValue({ count: 0 });
    mockedContactsViral.isSupported.mockReturnValue(false);
  });

  it.each(["/", "/ranking", "/drawing/123"])(
    "%s 경로에서는 공유 버튼을 노출한다",
    (path) => {
      renderAt(path);
      expect(
        screen.getByRole("button", { name: "공유하기" }),
      ).toBeInTheDocument();
    },
  );

  it.each(["/login", "/memorize", "/drawing", "/submitted"])(
    "%s 경로에서는 공유 버튼을 노출하지 않는다",
    (path) => {
      renderAt(path);
      expect(
        screen.queryByRole("button", { name: "공유하기" }),
      ).not.toBeInTheDocument();
    },
  );

  it("버튼을 누르면 공유 종류 선택 시트가 열린다", async () => {
    renderAt("/");

    await act(async () => {
      screen.getByRole("button", { name: "공유하기" }).click();
    });

    expect(screen.getByText("공유하기")).toBeInTheDocument();
    expect(screen.getByText("점수 자랑하기")).toBeInTheDocument();
    expect(screen.getByText("친구 초대하고 기회 받기")).toBeInTheDocument();
  });
});
