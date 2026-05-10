import { colors } from "@toss/tds-colors";
import { Border, Paragraph } from "@toss/tds-mobile";
import { MAX_PENALTY, MAX_SHAPE, MAX_STROKE_MATCH } from "../config/constants";
import {
  formatScore,
  getPenaltyText,
  getShapeText,
  getStrokeMatchText,
} from "../lib/getScoreText";

interface ScoreDetailCardProps {
  strokeMatchSimilarity: number;
  shapeSimilarity: number;
  penalty: number;
}

interface ScoreRowProps {
  label: string;
  description: string[];
  score: number;
  max: number;
  scoreColor: string;
  sign: "+" | "-";
}

const ScoreRow = ({
  label,
  description,
  score,
  max,
  scoreColor,
  sign,
}: ScoreRowProps) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-baseline justify-between gap-3">
      <Paragraph typography="t5">
        <Paragraph.Text fontWeight="medium">{label}</Paragraph.Text>
      </Paragraph>
      <Paragraph typography="t5">
        <Paragraph.Text fontWeight="medium" color={scoreColor}>
          {sign}
          {formatScore(score)}
        </Paragraph.Text>
        <Paragraph.Text color={colors.grey400}> / {max}점</Paragraph.Text>
      </Paragraph>
    </div>
    {description.map((line, index) => (
      <Paragraph key={`${index}-${line}`} typography="t6">
        <Paragraph.Text color={colors.grey500}>{line}</Paragraph.Text>
      </Paragraph>
    ))}
  </div>
);

const ScoreDetailCard = ({
  strokeMatchSimilarity,
  shapeSimilarity,
  penalty,
}: ScoreDetailCardProps) => (
  <div className="w-full flex flex-col gap-2">
    <ScoreRow
      label="선 유사도"
      description={getStrokeMatchText(strokeMatchSimilarity)}
      score={strokeMatchSimilarity}
      max={MAX_STROKE_MATCH}
      scoreColor={colors.blue500}
      sign="+"
    />
    <Border variant="full" />
    <ScoreRow
      label="형태 유사도"
      description={getShapeText(shapeSimilarity)}
      score={shapeSimilarity}
      max={MAX_SHAPE}
      scoreColor={colors.blue500}
      sign="+"
    />
    <Border variant="full" />
    <ScoreRow
      label="감점"
      description={getPenaltyText(penalty)}
      score={penalty}
      max={MAX_PENALTY}
      scoreColor={colors.red500}
      sign="-"
    />
  </div>
);

export default ScoreDetailCard;
