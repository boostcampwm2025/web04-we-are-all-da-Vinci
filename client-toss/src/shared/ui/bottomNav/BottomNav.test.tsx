/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BottomNav from "./BottomNav";

const renderAt = (path: string, centerSlot?: ReactNode) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav centerSlot={centerSlot} />
    </MemoryRouter>,
  );

describe("하단 플로팅 탭바", () => {
  it("노출 경로에서는 플로팅 알약 형태로 렌더된다", () => {
    renderAt("/");

    const nav = screen.getByRole("navigation", { name: "주요 메뉴" });
    expect(nav).toHaveClass("tabbar");
  });

  it("화면 하단에 붙는 풀블리드 바 스타일을 쓰지 않는다", () => {
    renderAt("/");

    const nav = screen.getByRole("navigation", { name: "주요 메뉴" });
    expect(nav.className).not.toMatch(/inset-x-0|bottom-0|border-t/);
  });

  it("칸 수가 가이드 상한인 5개를 넘지 않는다", () => {
    renderAt("/", <button type="button">테스트 시작</button>);

    const nav = screen.getByRole("navigation", { name: "주요 메뉴" });
    const slots = within(nav).getAllByRole("listitem");
    expect(slots.length).toBeGreaterThanOrEqual(2);
    expect(slots.length).toBeLessThanOrEqual(5);
  });

  it("탭 목적지가 아닌 경로에서는 렌더되지 않는다", () => {
    renderAt("/drawing");

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
