import { TextButton, Top } from "@toss/tds-mobile";
import { Podium } from "./Podium";

export const Standing = () => {
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
      <Podium />
      <TextButton size="xsmall" variant="arrow" arrowPlacement="inline">
        TOP100 랭킹 보러가기
      </TextButton>
    </div>
  );
};
