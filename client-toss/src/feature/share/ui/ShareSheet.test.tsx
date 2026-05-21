/// <reference types="@testing-library/jest-dom/vitest" />
import { PlayChanceProvider } from "@/feature/playChance";
import { serverTossApi } from "@/shared/api";
import {
  contactsViral,
  getTossShareLink,
  partner,
  share,
  tdsEvent,
} from "@apps-in-toss/web-framework";
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
import ShareSheet from "./ShareSheet";

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    getMyChance: vi.fn(),
    getMyRanking: vi.fn(),
    chargeChanceByShare: vi.fn(),
  },
  RequestError: class RequestError extends Error {},
  getAnalyticsInstance: vi.fn().mockReturnValue(null),
}));

const mockedApi = serverTossApi as unknown as {
  getMyChance: Mock;
  getMyRanking: Mock;
  chargeChanceByShare: Mock;
};
const mockedContactsViral = contactsViral as unknown as Mock & {
  isSupported: Mock;
};

const renderShareSheet = () =>
  render(
    <PlayChanceProvider>
      <ShareSheet />
    </PlayChanceProvider>,
  );

/** `tdsEvent.addEventListener`에 등록된 액세서리 버튼 핸들러를 꺼낸다. */
const getAccessoryHandler = () => {
  const calls = (tdsEvent.addEventListener as Mock).mock.calls;
  const lastCall = calls[calls.length - 1];
  return lastCall[1].onEvent as (event: { id: string }) => void;
};

const openSheet = async () => {
  await act(async () => {
    getAccessoryHandler()({ id: "share" });
  });
};

describe("공유 시트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getMyChance.mockResolvedValue({ count: 0 });
    mockedApi.getMyRanking.mockResolvedValue({ state: "NOT_FOUND" });
    mockedApi.chargeChanceByShare.mockResolvedValue({ count: 3 });
    mockedContactsViral.isSupported.mockReturnValue(false);
    mockedContactsViral.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    // 테스트 간 환경변수가 새지 않도록 정리 — assertion 실패 시에도 보장
    // @ts-expect-error: 테스트에서 주입한 환경변수 제거
    delete import.meta.env.VITE_CONTACTS_VIRAL_MODULE_ID;
  });

  it("마운트 시 네비게이션 바 공유 액세서리 버튼을 등록한다", async () => {
    renderShareSheet();

    await waitFor(() => {
      expect(partner.addAccessoryButton).toHaveBeenCalledWith({
        id: "share",
        title: "공유",
        icon: { name: "icon-share-dots-thin-mono" },
      });
    });
  });

  it("액세서리 버튼 이벤트를 받으면 공유 종류 선택 시트가 열린다", async () => {
    renderShareSheet();
    await openSheet();

    expect(screen.getByText("공유하기")).toBeInTheDocument();
    expect(screen.getByText("점수 자랑하기")).toBeInTheDocument();
    expect(screen.getByText("친구 초대하고 기회 받기")).toBeInTheDocument();
    expect(
      screen.getByText("친구 초대 보상은 하루 5번까지 받을 수 있어요."),
    ).toBeInTheDocument();
  });

  it("점수 자랑 항목을 누르면 점수 공유가 실행되고 시트가 닫힌다", async () => {
    renderShareSheet();
    await openSheet();

    await act(async () => {
      screen.getByRole("button", { name: /점수 자랑/ }).click();
    });

    await waitFor(() => {
      expect(getTossShareLink).toHaveBeenCalled();
      expect(share).toHaveBeenCalled();
    });
    expect(screen.queryByText("공유하기")).not.toBeInTheDocument();
  });

  it("친구 초대 항목을 누르면 contactsViral 공유가 실행된다", async () => {
    mockedContactsViral.isSupported.mockReturnValue(true);
    // @ts-expect-error: 테스트에서 환경변수 주입
    import.meta.env.VITE_CONTACTS_VIRAL_MODULE_ID = "test-module";

    renderShareSheet();
    await openSheet();

    await act(async () => {
      screen.getByRole("button", { name: /친구 초대/ }).click();
    });

    expect(mockedContactsViral).toHaveBeenCalledWith(
      expect.objectContaining({ options: { moduleId: "test-module" } }),
    );
  });

  it("친구 초대 적립이 완료되면 토스트를 띄우고 그리기 기회를 다시 불러온다", async () => {
    mockedContactsViral.isSupported.mockReturnValue(true);
    // @ts-expect-error: 테스트에서 환경변수 주입
    import.meta.env.VITE_CONTACTS_VIRAL_MODULE_ID = "test-module";

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

    renderShareSheet();
    await waitFor(() => expect(mockedApi.getMyChance).toHaveBeenCalledTimes(1));
    await openSheet();

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
      expect(mockedApi.getMyChance).toHaveBeenCalledTimes(2);
    });
  });
});
