/// <reference types="@testing-library/jest-dom/vitest" />
import type { PodiumResponse } from "@/entities/podium";
import { render, screen } from "@testing-library/react";
import { Button } from "@toss/tds-mobile";
import { describe, expect, it, vi } from "vitest";
import ChallengeCard from "./ChallengeCard";

vi.mock("@/feature/share", () => ({
  ShareSheet: () => null,
}));

const renderCard = (
  podium?: PodiumResponse["podium"],
  participantCount?: number,
) =>
  render(
    <ChallengeCard
      cta={<Button>도전</Button>}
      podium={podium}
      participantCount={participantCount}
    />,
  );

describe("도전 카드", () => {
  it("최고점과 참가자수를 보여준다", () => {
    renderCard([{ nickname: "다빈치", score: 88 }], 1234);

    expect(screen.getByText("88점")).toBeInTheDocument();
    expect(screen.getByText("1,234명")).toBeInTheDocument();
  });

  it("podium·participantCount가 없으면 -로 표시한다", () => {
    renderCard(undefined, undefined);

    // 최고점·참가자수 둘 다 "-"
    expect(screen.getAllByText("-")).toHaveLength(2);
  });

  it("전달받은 cta를 렌더한다", () => {
    renderCard([], 0);

    expect(screen.getByText("도전")).toBeInTheDocument();
  });
});
