import { TextButton, Top } from "@toss/tds-mobile";

export const Standing = () => {
  return (
    <div className="flex flex-col items-center">
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
      {/* 스탠딩 */}
      <TextButton size="xsmall" variant="arrow" arrowPlacement="inline">
        TOP100 랭킹 보러가기
      </TextButton>
    </div>
  );
};
