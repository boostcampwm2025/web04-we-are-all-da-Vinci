import { Top } from "@toss/tds-mobile";

interface HeaderProps {
  title: string;
  subTitle?: string;
}

export const Header = ({ title, subTitle }: HeaderProps) => {
  return (
    <Top
      title={
        <Top.TitleParagraph role="heading" aria-level={1}>
          {title}
        </Top.TitleParagraph>
      }
      subtitleBottom={
        <Top.SubtitleParagraph role="heading" aria-level={2}>
          {subTitle}
        </Top.SubtitleParagraph>
      }
    />
  );
};
