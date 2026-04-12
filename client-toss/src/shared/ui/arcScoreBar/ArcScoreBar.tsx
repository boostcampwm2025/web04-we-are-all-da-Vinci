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
const calcRad = (score: number) => {
  // Radian = PI / 180 * Degree
  // Degree = score / 100 * 90
  // 90도가 100점
  return (Math.PI / 180) * ((score / 100) * 90);
};

const RADIUS = 100;

export const ArcScoreBar = () => {
  const gapRad = calcRad(2);

  const shapeSim = 23.44;
  const shapeSimRad = calcRad(shapeSim);

  const countSim = 30.4;
  const countSimRad = calcRad(countSim);
  const baseSimRad = Math.PI / 2 - (shapeSimRad + countSimRad + 2 * gapRad);

  const penalty = 10.0;
  const penaltyRad = calcRad(penalty);

  const basePenaltyRad = Math.PI / 2 - (penaltyRad + 2 * gapRad);

  const paths: Arc[] = [
    {
      rad: baseSimRad,
      stroke: "#E8F3FF",
      start: { x: RADIUS * Math.cos(0), y: RADIUS * Math.sin(0) },
      end: {
        x: RADIUS * Math.cos(baseSimRad),
        y: -RADIUS * Math.sin(baseSimRad),
      },
    },
    {
      rad: gapRad,
      stroke: "#F9FAFB",
      start: {
        x: RADIUS * Math.cos(baseSimRad),
        y: -RADIUS * Math.sin(baseSimRad),
      },
      end: {
        x: RADIUS * Math.cos(baseSimRad + gapRad),
        y: -RADIUS * Math.sin(baseSimRad + gapRad),
      },
    },
    {
      rad: shapeSimRad,
      stroke: "#3182F6",
      start: {
        x: RADIUS * Math.cos(baseSimRad + gapRad),
        y: -RADIUS * Math.sin(baseSimRad + gapRad),
      },
      end: {
        x: RADIUS * Math.cos(baseSimRad + gapRad + shapeSimRad),
        y: -RADIUS * Math.sin(baseSimRad + gapRad + shapeSimRad),
      },
    },
    {
      rad: gapRad,
      stroke: "#F9FAFB",
      start: {
        x: RADIUS * Math.cos(baseSimRad + gapRad + shapeSimRad),
        y: -RADIUS * Math.sin(baseSimRad + gapRad + shapeSimRad),
      },
      end: {
        x: RADIUS * Math.cos(baseSimRad + gapRad + gapRad + shapeSimRad),
        y: -RADIUS * Math.sin(baseSimRad + gapRad + gapRad + shapeSimRad),
      },
    },
    {
      rad: countSimRad,
      stroke: "#3182F6",
      start: {
        x: RADIUS * Math.cos(baseSimRad + gapRad + gapRad + shapeSimRad),
        y: -RADIUS * Math.sin(baseSimRad + gapRad + gapRad + shapeSimRad),
      },
      end: {
        x:
          RADIUS *
          Math.cos(baseSimRad + gapRad + gapRad + shapeSimRad + countSimRad),
        y:
          -RADIUS *
          Math.sin(baseSimRad + gapRad + gapRad + shapeSimRad + countSimRad),
      },
    },
    {
      rad: gapRad,
      stroke: "#F9FAFB",
      start: {
        x:
          RADIUS *
          Math.cos(baseSimRad + 2 * gapRad + shapeSimRad + countSimRad),
        y:
          -RADIUS *
          Math.sin(baseSimRad + 2 * gapRad + shapeSimRad + countSimRad),
      },
      end: {
        x:
          RADIUS *
          Math.cos(baseSimRad + 3 * gapRad + shapeSimRad + countSimRad),
        y:
          -RADIUS *
          Math.sin(baseSimRad + 3 * gapRad + shapeSimRad + countSimRad),
      },
    },
    {
      rad: penaltyRad,
      stroke: "#F66570",
      start: {
        x:
          RADIUS *
          Math.cos(baseSimRad + 3 * gapRad + shapeSimRad + countSimRad),
        y:
          -RADIUS *
          Math.sin(baseSimRad + 3 * gapRad + shapeSimRad + countSimRad),
      },
      end: {
        x:
          RADIUS *
          Math.cos(
            baseSimRad + 3 * gapRad + shapeSimRad + countSimRad + penaltyRad,
          ),
        y:
          -RADIUS *
          Math.sin(
            baseSimRad + 3 * gapRad + shapeSimRad + countSimRad + penaltyRad,
          ),
      },
    },
    {
      rad: gapRad,
      stroke: "#F9FAFB",
      start: {
        x:
          RADIUS *
          Math.cos(
            baseSimRad + 3 * gapRad + shapeSimRad + countSimRad + penaltyRad,
          ),
        y:
          -RADIUS *
          Math.sin(
            baseSimRad + 3 * gapRad + shapeSimRad + countSimRad + penaltyRad,
          ),
      },
      end: {
        x:
          RADIUS *
          Math.cos(
            baseSimRad + 4 * gapRad + shapeSimRad + countSimRad + penaltyRad,
          ),
        y:
          -RADIUS *
          Math.sin(
            baseSimRad + 4 * gapRad + shapeSimRad + countSimRad + penaltyRad,
          ),
      },
    },
    {
      rad: basePenaltyRad,
      stroke: "#FFEEEE",
      start: {
        x:
          RADIUS *
          Math.cos(
            baseSimRad + 4 * gapRad + shapeSimRad + countSimRad + penaltyRad,
          ),
        y:
          -RADIUS *
          Math.sin(
            baseSimRad + 4 * gapRad + shapeSimRad + countSimRad + penaltyRad,
          ),
      },
      end: {
        x:
          RADIUS *
          Math.cos(
            baseSimRad +
              4 * gapRad +
              shapeSimRad +
              countSimRad +
              penaltyRad +
              basePenaltyRad,
          ),
        y:
          -RADIUS *
          Math.sin(
            baseSimRad +
              4 * gapRad +
              shapeSimRad +
              countSimRad +
              penaltyRad +
              basePenaltyRad,
          ),
      },
    },
  ];

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
