import { ProgressBar } from "@toss/tds-mobile";

interface PhaseHeaderProps {
  title: string;
  description?: string;
  progress: number;
}

const PhaseHeader = ({ title, description, progress }: PhaseHeaderProps) => {
  return (
    <div className="px-(--page-px) pt-4 pb-2">
      <h1 className="text-[22px] font-bold leading-tight">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-(--color-description)">{description}</p>
      )}
      <div className="mt-3">
        <ProgressBar progress={progress} size="bold" animate />
      </div>
    </div>
  );
};
export default PhaseHeader;
