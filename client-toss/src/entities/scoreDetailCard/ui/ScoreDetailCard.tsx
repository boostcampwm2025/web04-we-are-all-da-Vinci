import { colors } from "@toss/tds-colors";
import { MAX_PENALTY, MAX_SHAPE, MAX_STROKE_MATCH } from "../config/constants";
import {
  getPenaltyText,
  getShapeText,
  getStrokeMatchText,
} from "../lib/getScoreText";
import ScoreRow from "./ScoreRow";

interface ScoreDetailCardProps {
  strokeMatchSimilarity: number;
  shapeSimilarity: number;
  penalty: number;
}

const ScoreDetailCard = ({
  strokeMatchSimilarity,
  shapeSimilarity,
  penalty,
}: ScoreDetailCardProps) => (
  <div className="w-full flex flex-col gap-4">
    <ScoreRow
      label="선 유사도"
      description={getStrokeMatchText(strokeMatchSimilarity)}
      score={strokeMatchSimilarity}
      max={MAX_STROKE_MATCH}
      scoreColor={colors.blue500}
      sign="+"
      variant="positive"
    />

    <ScoreRow
      label="형태 유사도"
      description={getShapeText(shapeSimilarity)}
      score={shapeSimilarity}
      max={MAX_SHAPE}
      scoreColor={colors.blue500}
      sign="+"
      variant="positive"
    />

    <ScoreRow
      label="감점"
      score={penalty}
      description={getPenaltyText(penalty)}
      max={MAX_PENALTY}
      scoreColor={colors.red500}
      sign="-"
      variant="negative"
    />
  </div>
);

export default ScoreDetailCard;
