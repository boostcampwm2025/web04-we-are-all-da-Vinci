/// <reference types="@testing-library/jest-dom/vitest" />
import type { PodiumResponse } from "@/entities/podium";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import TodayDavinciCard from "./TodayDavinciCard";

const renderCard = (podium?: PodiumResponse["podium"]) =>
  render(
    <MemoryRouter>
      <TodayDavinciCard podium={podium} />
    </MemoryRouter>,
  );

const samplePodium: PodiumResponse["podium"] = [
  { nickname: "다빈치", score: 88.5 },
  { nickname: "고흐", score: 77.25 },
  { nickname: "피카소", score: 66 },
];

describe("TodayDavinciCard", () => {
  it("시상대 top3를 점수와 함께 보여준다", () => {
    renderCard(samplePodium);

    expect(screen.getByText("다빈치")).toBeInTheDocument();
    expect(screen.getByText("고흐")).toBeInTheDocument();
    expect(screen.getByText("피카소")).toBeInTheDocument();
    expect(screen.getByText("88.50점")).toBeInTheDocument();
  });

  it("podium이 빈 배열이면 안내 문구를 보여준다", () => {
    renderCard([]);

    expect(screen.getByText("아직 오늘의 다빈치가 없어요")).toBeInTheDocument();
  });

  it("podium이 undefined면 로딩 상태로 항목·안내를 노출하지 않는다", () => {
    renderCard(undefined);

    expect(screen.queryByText("다빈치")).not.toBeInTheDocument();
    expect(
      screen.queryByText("아직 오늘의 다빈치가 없어요"),
    ).not.toBeInTheDocument();
  });
});
