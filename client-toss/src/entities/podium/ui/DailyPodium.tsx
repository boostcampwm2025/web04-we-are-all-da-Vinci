import { TextButton, Top } from "@toss/tds-mobile";
import { Podium } from "./Podium";
import type { PodiumEntry } from "../model/types";

interface DailyPodiumProps {
  entries: PodiumEntry[];
}

export const DailyPodium = ({ entries }: DailyPodiumProps) => {
  return (
    <div className="flex flex-col items-center gap-8">
      <Top
        title={
          <Top.TitleParagraph role="heading" aria-level={1}>
            오늘의 다빈치
          </Top.TitleParagraph>
        }
        subtitleBottom={
          <Top.SubtitleParagraph role="heading" aria-level={2}>
            명예의 전당
          </Top.SubtitleParagraph>
        }
      />
      <Podium entries={entries} />
      <TextButton size="xsmall" variant="arrow" arrowPlacement="inline">
        TOP100 랭킹 보러가기
      </TextButton>
    </div>
  );
};
