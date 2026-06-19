import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getOvertaken = vi.fn();
const saveOvertaken = vi.fn();
const getDailyPrompt = vi.fn();
const saveDailyPrompt = vi.fn();

vi.mock("@/shared/api", () => ({
  serverTossApi: {
    getOvertakenNotificationAgreement: () => getOvertaken(),
    saveOvertakenNotificationAgreement: (body: unknown) => saveOvertaken(body),
    getDailyPromptNotificationAgreement: () => getDailyPrompt(),
    saveDailyPromptNotificationAgreement: (body: unknown) =>
      saveDailyPrompt(body),
  },
}));

type SheetProps = { open: boolean; onClose: () => void };

const loadSheet = async (): Promise<ComponentType<SheetProps>> => {
  const mod = await import("./NotificationCenterSheet");
  return mod.default;
};

const loadSdk = async () => {
  const mod = await import("@apps-in-toss/web-framework");
  return vi.mocked(mod.requestNotificationAgreement);
};

describe("알림 설정 시트 토글", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("VITE_TOSS_TEMPLATE_OVERTAKEN", "OVT_CODE");
    vi.stubEnv("VITE_TOSS_TEMPLATE_DAILY_PROMPT", "DP_CODE");
    // 기본: 일일 프롬프트는 미동의(OFF), 랭킹 추월은 동의(ON) 상태로 시작.
    getDailyPrompt.mockResolvedValue({ status: "unknown" });
    getOvertaken.mockResolvedValue({ status: "agreed" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("켜진 알림을 누르면 끄기 확인 다이얼로그를 먼저 띄운다", async () => {
    const Sheet = await loadSheet();
    render(<Sheet open onClose={vi.fn()} />);

    await waitFor(() => expect(getOvertaken).toHaveBeenCalled());

    fireEvent.click(screen.getByText("랭킹 추월 알림"));

    expect(screen.getByText("알림 끄기")).toBeTruthy();
    expect(saveOvertaken).not.toHaveBeenCalled();
  });

  it("확인 다이얼로그에서 끄기를 누르면 SDK 없이 서버에 거부를 저장한다", async () => {
    saveOvertaken.mockResolvedValue({ status: "rejected" });
    const Sheet = await loadSheet();
    const sdk = await loadSdk();
    render(<Sheet open onClose={vi.fn()} />);

    await waitFor(() => expect(getOvertaken).toHaveBeenCalled());

    fireEvent.click(screen.getByText("랭킹 추월 알림"));
    fireEvent.click(screen.getByText("알림 끄기"));

    await waitFor(() =>
      expect(saveOvertaken).toHaveBeenCalledWith({
        eventType: "agreementRejected",
      }),
    );
    expect(sdk).not.toHaveBeenCalled();
  });

  it("확인 다이얼로그에서 유지하기를 누르면 아무 변경도 하지 않는다", async () => {
    const Sheet = await loadSheet();
    render(<Sheet open onClose={vi.fn()} />);

    await waitFor(() => expect(getOvertaken).toHaveBeenCalled());

    fireEvent.click(screen.getByText("랭킹 추월 알림"));
    fireEvent.click(screen.getByText("유지하기"));

    expect(screen.queryByText("알림 끄기")).toBeNull();
    expect(saveOvertaken).not.toHaveBeenCalled();
  });

  it("꺼진 알림을 누르면 토스 동의 SDK를 호출한다", async () => {
    const Sheet = await loadSheet();
    const sdk = await loadSdk();
    render(<Sheet open onClose={vi.fn()} />);

    await waitFor(() => expect(getDailyPrompt).toHaveBeenCalled());

    fireEvent.click(screen.getByText("오늘의 그림 알림"));

    expect(sdk).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("알림 끄기")).toBeNull();
  });
});
