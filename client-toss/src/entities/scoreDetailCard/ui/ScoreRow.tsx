import { Paragraph } from "@toss/tds-mobile";
import { formatScore } from "../lib/getScoreText";
import { colors } from "@toss/tds-colors";
import ScoreBar from "./ScoreBar";

interface ScoreRowProps {
  label: string;
  description?: string[];
  score: number;
  max: number;
  scoreColor: string;
  sign: "+" | "-";
  variant: "positive" | "negative";
}

const ScoreRow = ({
  label,
  description,
  score,
  max,
  scoreColor,
  sign,
  variant,
}: ScoreRowProps) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-baseline justify-between gap-3">
      <Paragraph typography="t5">
        <Paragraph.Text fontWeight="medium">{label}</Paragraph.Text>
      </Paragraph>

      <Paragraph typography="t6">
        <Paragraph.Text fontWeight="medium" color={scoreColor} typography="t5">
          {sign}
          {formatScore(score)}
        </Paragraph.Text>
        <Paragraph.Text color={colors.grey500}> / {max}점</Paragraph.Text>
      </Paragraph>
    </div>

    <ScoreBar score={score} max={max} variant={variant} />

    {description && description.length > 0 && (
      <div className="flex flex-col gap-0.5">
        {description.map((line, index) => (
          <Paragraph key={`${index}-${line}`} typography="t7">
            <Paragraph.Text color={colors.grey500}>{line}</Paragraph.Text>
          </Paragraph>
        ))}
      </div>
    )}
  </div>
);
export default ScoreRow;
