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

export const ArcScoreBar = () => {
  const gapRad = calcRad(2);

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
    <svg width="220" height="220" viewBox="-110 -110 220 220">
      {paths.map((p) => (
        <path
          d={`M${p.start.x},${p.start.y} A100,100 0 0 0 ${p.end.x},${p.end.y}`}
          fill="none"
          stroke={`${p.stroke}`}
          strokeWidth="16"
        />
      ))}
    </svg>
  );
};
