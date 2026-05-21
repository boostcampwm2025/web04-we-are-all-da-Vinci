/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INFO_TICKER_INTERVAL_MS,
  INFO_TICKER_MESSAGES,
} from "../config/infoTicker";
import InfoTicker from "./InfoTicker";

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe("앱 안내 티커", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("첫 메시지를 렌더한다", () => {
    render(<InfoTicker />);
    expect(screen.getByText(INFO_TICKER_MESSAGES[0])).toBeInTheDocument();
  });

  it("전환 간격이 지나면 다음 메시지로 바뀐다", () => {
    render(<InfoTicker />);
    advance(INFO_TICKER_INTERVAL_MS);
    expect(screen.getByText(INFO_TICKER_MESSAGES[1])).toBeInTheDocument();
    expect(screen.queryByText(INFO_TICKER_MESSAGES[0])).not.toBeInTheDocument();
  });

  it("마지막 메시지 다음에는 첫 메시지로 순환한다", () => {
    render(<InfoTicker />);
    advance(INFO_TICKER_INTERVAL_MS * INFO_TICKER_MESSAGES.length);
    expect(screen.getByText(INFO_TICKER_MESSAGES[0])).toBeInTheDocument();
  });

  it("언마운트 시 인터벌을 정리한다", () => {
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = render(<InfoTicker />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
