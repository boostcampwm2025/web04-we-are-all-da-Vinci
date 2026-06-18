/// <reference types="@testing-library/jest-dom/vitest" />
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RankBadge from "./RankBadge";

describe("순위 배지", () => {
  it("1·2·3등은 각각 메달 색을 적용한다", () => {
    render(
      <>
        <RankBadge rank={1} />
        <RankBadge rank={2} />
        <RankBadge rank={3} />
      </>,
    );

    expect(screen.getByText("1")).toHaveClass(
      "bg-(--color-gold)",
      "text-white",
    );
    expect(screen.getByText("2")).toHaveClass(
      "bg-(--color-silver)",
      "text-white",
    );
    expect(screen.getByText("3")).toHaveClass(
      "bg-(--color-bronze)",
      "text-white",
    );
  });

  it("4등 이상은 기본 색을 적용한다", () => {
    render(<RankBadge rank={4} />);

    const badge = screen.getByText("4");
    expect(badge).toHaveClass(
      "bg-(--color-card)",
      "text-(--color-description)",
    );
    expect(badge).not.toHaveClass("bg-(--color-gold)");
  });

  it("className으로 크기·위치를 주입할 수 있다", () => {
    render(<RankBadge rank={1} className="absolute top-1.5 h-6" />);

    expect(screen.getByText("1")).toHaveClass("absolute", "top-1.5", "h-6");
  });
});
