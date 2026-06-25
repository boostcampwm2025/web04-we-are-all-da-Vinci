import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./getAnonymousHash", () => ({
  getAnonymousHash: vi.fn().mockResolvedValue("test-hash"),
}));

const trackClick = vi.fn();
const trackScreen = vi.fn();
vi.mock("./analytics", () => ({
  trackClick: (...args: unknown[]) => trackClick(...args),
  trackScreen: (...args: unknown[]) => trackScreen(...args),
  trackImpression: vi.fn(),
}));

import { captureAttributionOnce } from "./attribution";
import { FUNNEL_EVENTS } from "./funnelEvents";

const setLocation = (search: string) => {
  Object.defineProperty(window, "location", {
    writable: true,
    value: { search, pathname: "/", href: `http://localhost/${search}` },
  });
};

describe("captureAttributionOnce", () => {
  beforeEach(() => {
    localStorage.clear();
    trackClick.mockClear();
    trackScreen.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("utm이 없으면 아무것도 안 해요", async () => {
    setLocation("");
    await captureAttributionOnce();

    expect(trackClick).not.toHaveBeenCalled();
    expect(trackScreen).not.toHaveBeenCalled();
  });

  it("utm_source가 daily-prompt면 notification_open을 발화해요", async () => {
    setLocation("?utm_source=daily-prompt&utm_campaign=2026-05-28");
    await captureAttributionOnce();

    expect(trackClick).toHaveBeenCalledWith(
      FUNNEL_EVENTS.notificationOpen,
      expect.objectContaining({
        utm_source: "daily-prompt",
        utm_campaign: "2026-05-28",
      }),
    );
  });

  it("utm_source가 overtaken이어도 notification_open을 발화해요", async () => {
    setLocation("?utm_source=overtaken&utm_campaign=2026-05-28");
    await captureAttributionOnce();

    expect(trackClick).toHaveBeenCalledWith(
      FUNNEL_EVENTS.notificationOpen,
      expect.objectContaining({ utm_source: "overtaken" }),
    );
  });

  it("알림 utm이 아니면 notification_open을 발화 안 해요", async () => {
    setLocation("?utm_source=external_ad");
    await captureAttributionOnce();

    expect(trackClick).not.toHaveBeenCalled();
    // firstTouch는 잡힘
    expect(trackScreen).toHaveBeenCalledWith(
      FUNNEL_EVENTS.attributionFirstTouch,
      expect.objectContaining({ utm_source: "external_ad" }),
    );
  });

  it("첫 진입만 attribution_first_touch가 발화돼요", async () => {
    setLocation("?utm_source=daily-prompt");
    await captureAttributionOnce();
    await captureAttributionOnce();

    expect(trackScreen).toHaveBeenCalledTimes(1);
    expect(trackScreen).toHaveBeenCalledWith(
      FUNNEL_EVENTS.attributionFirstTouch,
      expect.any(Object),
    );
  });

  it("알림 진입은 매번 notification_open이 발화돼요", async () => {
    setLocation("?utm_source=daily-prompt&utm_campaign=2026-05-28");
    await captureAttributionOnce();
    await captureAttributionOnce();
    await captureAttributionOnce();

    expect(trackClick).toHaveBeenCalledTimes(3);
  });
});
