interface Position {
  x: number;
  y: number;
}

interface Arc {
  rad: number;
  start: Position;
  end: Position;
  stroke: string;
  radius: number;
  strokeWidth: number;
}

interface ArcScoreBarProps {
  shapeSimilarity: number; // 0 ~ 10
  strokeMatchSimilarity: number; // 0 ~ 90
  penalty: number; // 0 ~ 75
}

const OUTER_RADIUS = 100;
const INNER_RADIUS = 72;

const OUTER_STROKE_WIDTH = 16;
const INNER_STROKE_WIDTH = 12;

const PI = Math.PI;

const SCORE_MAX = 100;
const PENALTY_MAX = 75;

const SCORE_STROKE = "#3182F6";
const SCORE_BACKGROUND_STROKE = "#E8F3FF";

const PENALTY_STROKE = "#F66570";
const PENALTY_BACKGROUND_STROKE = "#FFEEEE";

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

const pointOnArc = (angle: number, radius: number): Position => ({
  x: radius * Math.cos(angle),
  y: -radius * Math.sin(angle),
});

const makeArc = (
  startAngle: number,
  rad: number,
  stroke: string,
  radius: number,
  strokeWidth: number,
): Arc => {
  const endAngle = startAngle + rad;

  return {
    rad,
    stroke,
    radius,
    strokeWidth,
    start: pointOnArc(startAngle, radius),
    end: pointOnArc(endAngle, radius),
  };
};

const scoreToRad = (value: number, maxValue: number) => {
  const ratio = clamp(value / maxValue, 0, 1);
  return ratio * PI;
};

const ArcPath = ({ arc }: { arc: Arc }) => {
  if (arc.rad <= 0) {
    return null;
  }

  return (
    <path
      d={`M ${arc.start.x} ${arc.start.y} A ${arc.radius} ${arc.radius} 0 0 0 ${arc.end.x} ${arc.end.y}`}
      fill="none"
      stroke={arc.stroke}
      strokeWidth={arc.strokeWidth}
      strokeLinecap="round"
    />
  );
};

const ArcScoreBar = ({
  shapeSimilarity,
  strokeMatchSimilarity,
  penalty,
}: ArcScoreBarProps) => {
  const totalScore = clamp(
    shapeSimilarity + strokeMatchSimilarity,
    0,
    SCORE_MAX,
  );
  const clampedPenalty = clamp(penalty, 0, PENALTY_MAX);

  const scoreRad = scoreToRad(totalScore, SCORE_MAX);
  const penaltyRad = scoreToRad(clampedPenalty, PENALTY_MAX);

  const scoreBackgroundArc = makeArc(
    0,
    PI,
    SCORE_BACKGROUND_STROKE,
    OUTER_RADIUS,
    OUTER_STROKE_WIDTH,
  );

  const scoreArc = makeArc(
    0,
    scoreRad,
    SCORE_STROKE,
    OUTER_RADIUS,
    OUTER_STROKE_WIDTH,
  );

  const penaltyBackgroundArc = makeArc(
    0,
    PI,
    PENALTY_BACKGROUND_STROKE,
    INNER_RADIUS,
    INNER_STROKE_WIDTH,
  );

  const penaltyArc = makeArc(
    0,
    penaltyRad,
    PENALTY_STROKE,
    INNER_RADIUS,
    INNER_STROKE_WIDTH,
  );

  return (
    <svg
      width={2 * OUTER_RADIUS + 24}
      height={OUTER_RADIUS + 24}
      viewBox={`${-OUTER_RADIUS - 12} ${-OUTER_RADIUS - 12} ${
        2 * OUTER_RADIUS + 24
      } ${OUTER_RADIUS + 24}`}
    >
      <ArcPath arc={scoreBackgroundArc} />
      <ArcPath arc={scoreArc} />

      <ArcPath arc={penaltyBackgroundArc} />
      <ArcPath arc={penaltyArc} />
    </svg>
  );
};

export default ArcScoreBar;
