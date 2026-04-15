import { TextButton, Top } from "@toss/tds-mobile";
import { Podium } from "./Podium";
import type { PodiumEntry } from "../model/types";
import { Link } from "react-router-dom";

interface DailyPodiumProps {
  entries: PodiumEntry[];
}

const DailyPodium = ({ entries }: DailyPodiumProps) => {
  return (
    <div className="flex flex-col items-center gap-4">
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
      <Link to="/ranking">
        <TextButton size="xsmall" variant="arrow" arrowPlacement="inline">
          TOP100 랭킹 보러가기
        </TextButton>
      </Link>
    </div>
  );
};

export default DailyPodium;
