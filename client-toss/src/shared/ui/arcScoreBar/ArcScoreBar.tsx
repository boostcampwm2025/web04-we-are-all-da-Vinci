interface Position {
  x: number;
  y: number;
}
interface Arc {
  rad: number;
  start: Position;
  end: Position;
  stroke: string;
}

const RADIUS = 100;
const STROKE_WIDTH = 16;
const GAP = 2;

const calcRad = (score: number) => {
  // Radian = PI / 180 * Degree
  // Degree = score / 100 * 90
  // 90도가 100점
  return (Math.PI / 180) * ((score / 100) * 90);
};

const pointOnArc = (angle: number) => ({
  x: RADIUS * Math.cos(angle),
  y: -RADIUS * Math.sin(angle),
});

const makeArc = (startAngle: number, rad: number, stroke: string): Arc => {
  const endAngle = startAngle + rad;

  return {
    rad,
    stroke,
    start: pointOnArc(startAngle),
    end: pointOnArc(endAngle),
  };
};

const ArcScoreBar = () => {
  const gapRad = calcRad(GAP);

  const shapeSimRad = calcRad(23.44);
  const countSimRad = calcRad(30.4);
  const penaltyRad = calcRad(10.0);

  const baseSimRad = Math.PI / 2 - (shapeSimRad + countSimRad + 2 * gapRad);
  const basePenaltyRad = Math.PI / 2 - (penaltyRad + 2 * gapRad);

  const segments = [
    { rad: baseSimRad, stroke: "#E8F3FF" },
    { rad: gapRad, stroke: "#F9FAFB" },
    { rad: shapeSimRad, stroke: "#3182F6" },
    { rad: gapRad, stroke: "#F9FAFB" },
    { rad: countSimRad, stroke: "#3182F6" },
    { rad: gapRad, stroke: "#F9FAFB" },
    { rad: penaltyRad, stroke: "#F66570" },
    { rad: gapRad, stroke: "#F9FAFB" },
    { rad: basePenaltyRad, stroke: "#FFEEEE" },
  ];

  let currentAngle = 0;
  const paths = segments.map(({ rad, stroke }) => {
    const arc = makeArc(currentAngle, rad, stroke);
    currentAngle += rad;
    return arc;
  });

  return (
    <svg
      width={`${2 * RADIUS + 20}`}
      height={`${RADIUS + 20}`}
      viewBox={`${-RADIUS - 10} ${-RADIUS - 10} ${2 * RADIUS + 20} ${RADIUS + 10}`}
    >
      {paths.map((p) => (
        <path
          d={`M${p.start.x},${p.start.y} A${RADIUS},${RADIUS} 0 0 0 ${p.end.x},${p.end.y}`}
          fill="none"
          stroke={`${p.stroke}`}
          strokeWidth={`${STROKE_WIDTH}`}
        />
      ))}
    </svg>
  );
};

export default ArcScoreBar;
