import { ProgressBar, Top } from "@toss/tds-mobile";
import type { ReactNode } from "react";

interface PhaseHeaderProps {
  title: string;
  description?: ReactNode;
  progress?: number;
}

const PhaseHeader = ({ title, description, progress }: PhaseHeaderProps) => {
  return (
    <div className="pt-2 pb-2">
      <Top
        upperGap={12}
        lowerGap={progress === undefined ? 0 : 12}
        title={<Top.TitleParagraph size={22}>{title}</Top.TitleParagraph>}
        subtitleBottom={
          description ? (
            <Top.SubtitleParagraph size={13}>
              {description}
            </Top.SubtitleParagraph>
          ) : undefined
        }
      />
      {progress !== undefined && (
        <div className="px-(--page-px)">
          <ProgressBar progress={progress} size="bold" animate />
        </div>
      )}
    </div>
  );
};
export default PhaseHeader;
