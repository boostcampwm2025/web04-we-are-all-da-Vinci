/// <reference types="@testing-library/jest-dom/vitest" />
import { PlayChanceProvider } from "@/feature/playChance";
import { serverTossApi } from "@/shared/api";
import { contactsViral } from "@apps-in-toss/web-framework";
import { act, render, screen, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import InviteMissionButton from "./InviteMissionButton";

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    getMyChance: vi.fn(),
    chargeChanceByShare: vi.fn(),
  },
  RequestError: class RequestError extends Error {},
  getAnalyticsInstance: vi.fn().mockReturnValue(null),
}));

const mockedApi = serverTossApi as unknown as {
  getMyChance: Mock;
  chargeChanceByShare: Mock;
};
const mockedContactsViral = contactsViral as unknown as Mock & {
  isSupported: Mock;
};

describe("친구초대 미션 버튼", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getMyChance.mockResolvedValue({ count: 0 });
    mockedApi.chargeChanceByShare.mockResolvedValue({
      count: 1,
      chanceGranted: true,
    });
    mockedContactsViral.isSupported.mockReturnValue(true);
    mockedContactsViral.mockReturnValue(vi.fn());
    // @ts-expect-error: 테스트에서 환경변수 주입
    import.meta.env.VITE_CONTACTS_VIRAL_MODULE_ID = "test-module";
  });

  afterEach(() => {
    // @ts-expect-error: 테스트에서 주입한 환경변수 제거
    delete import.meta.env.VITE_CONTACTS_VIRAL_MODULE_ID;
  });

  const renderButton = (onInvited?: () => void) =>
    render(
      <PlayChanceProvider>
        <InviteMissionButton onInvited={onInvited} />
      </PlayChanceProvider>,
    );

  it("버튼을 누르면 친구 초대(contactsViral) 공유가 실행된다", async () => {
    renderButton();

    await act(async () => {
      screen.getByRole("button", { name: /친구 초대/ }).click();
    });

    expect(mockedContactsViral).toHaveBeenCalledWith(
      expect.objectContaining({ options: { moduleId: "test-module" } }),
    );
  });

  it("초대 적립이 완료되면 토스트를 띄우고 onInvited로 미션을 재조회하게 한다", async () => {
    let capturedOnEvent:
      | ((event: {
          type: string;
          data: { rewardAmount: number; rewardUnit: string };
        }) => void)
      | undefined;
    mockedContactsViral.mockImplementation(
      ({
        onEvent,
      }: {
        onEvent: (event: {
          type: string;
          data: { rewardAmount: number; rewardUnit: string };
        }) => void;
      }) => {
        capturedOnEvent = onEvent;
        return vi.fn();
      },
    );
    const onInvited = vi.fn();
    renderButton(onInvited);

    await act(async () => {
      screen.getByRole("button", { name: /친구 초대/ }).click();
    });

    await act(async () => {
      capturedOnEvent?.({
        type: "sendViral",
        data: { rewardAmount: 1, rewardUnit: "그리기 기회" },
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("그리기 기회 1회를 받았어요"),
      ).toBeInTheDocument();
      expect(onInvited).toHaveBeenCalled();
    });
  });
});
