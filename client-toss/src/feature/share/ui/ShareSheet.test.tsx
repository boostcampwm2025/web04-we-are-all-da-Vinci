/// <reference types="@testing-library/jest-dom/vitest" />
import { PlayChanceProvider } from "@/feature/playChance";
import { serverTossApi } from "@/shared/api";
import {
  contactsViral,
  getTossShareLink,
  share,
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

/** open=true로 시트를 띄운 상태에서 렌더한다. */
const renderShareSheet = () =>
  render(
    <PlayChanceProvider>
      <ShareSheet open onClose={() => {}} />
    </PlayChanceProvider>,
  );

describe("공유 시트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getMyChance.mockResolvedValue({ count: 0 });
    mockedApi.getMyRanking.mockResolvedValue({ state: "NOT_FOUND" });
    mockedApi.chargeChanceByShare.mockResolvedValue({
      count: 3,
      chanceGranted: true,
    });
    mockedContactsViral.isSupported.mockReturnValue(false);
    mockedContactsViral.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    // 테스트 간 환경변수가 새지 않도록 정리 — assertion 실패 시에도 보장
    // @ts-expect-error: 테스트에서 주입한 환경변수 제거
    delete import.meta.env.VITE_CONTACTS_VIRAL_MODULE_ID;
  });

  it("open이 true이면 공유 종류 선택 시트가 열린다", async () => {
    renderShareSheet();

    expect(screen.getByText("공유하기")).toBeInTheDocument();
    expect(screen.getByText("점수 자랑하기")).toBeInTheDocument();
    expect(screen.getByText("친구 초대하고 기회 받기")).toBeInTheDocument();
    expect(
      screen.getByText(
        "그리기 기회는 하루 3번까지 받고, 친구 5명을 초대하면 5원을 받아요.",
      ),
    ).toBeInTheDocument();
  });

  it("점수 자랑 항목을 누르면 점수 공유가 실행되고 onClose가 호출된다", async () => {
    const onClose = vi.fn();
    render(
      <PlayChanceProvider>
        <ShareSheet open onClose={onClose} />
      </PlayChanceProvider>,
    );

    await act(async () => {
      screen.getByRole("button", { name: /점수 자랑/ }).click();
    });

    await waitFor(() => {
      expect(getTossShareLink).toHaveBeenCalled();
      expect(share).toHaveBeenCalled();
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("친구 초대 항목을 누르면 contactsViral 공유가 실행된다", async () => {
    mockedContactsViral.isSupported.mockReturnValue(true);
    // @ts-expect-error: 테스트에서 환경변수 주입
    import.meta.env.VITE_CONTACTS_VIRAL_MODULE_ID = "test-module";

    renderShareSheet();

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

  it("기회 한도를 넘긴 초대(chanceGranted=false)는 미션 진행 안내 토스트를 띄운다", async () => {
    mockedContactsViral.isSupported.mockReturnValue(true);
    mockedApi.chargeChanceByShare.mockResolvedValue({
      count: 3,
      chanceGranted: false,
    });
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
        screen.getByText(
          "친구를 초대했어요! 그리기 기회는 하루 3번까지 받을 수 있어요",
        ),
      ).toBeInTheDocument();
    });
  });
});
