import { colors } from "@toss/tds-colors";

interface ScoreBarProps {
  score: number;
  max: number;
  variant: "positive" | "negative";
}
const ScoreBar = ({ score, max, variant }: ScoreBarProps) => {
  const ratio = max > 0 ? Math.min(Math.abs(score) / max, 1) : 0;

  const percentage = ratio === 0 ? 0 : Math.max(ratio * 100, 4);

  const fillColor = variant === "positive" ? colors.blue500 : colors.red500;

  return (
    <div
      className="
        h-5
        w-full
        overflow-hidden
        rounded-md
        border
      "
      style={{
        backgroundColor: colors.grey100,
        borderColor: colors.grey900,
      }}
    >
      <div
        className="h-full rounded-r-sm"
        style={{
          width: `${percentage}%`,
          backgroundColor: fillColor,
        }}
      />
    </div>
  );
};

export default ScoreBar;
