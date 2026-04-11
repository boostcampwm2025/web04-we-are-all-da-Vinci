interface Position {
  x: number;
  y: number;
}
interface Arc {
  start: Position;
  end: Position;
  stroke: string;
}
const calcRad = (score: number) => {
  return (Math.PI / 2) * (score / 100);
};

export const ArcScoreBar = () => {
  const RADIUS = 100;

  const shapeSim = 23.44;
  const shapeSimRad = calcRad(shapeSim);

  const countSim = 30.4;
  const countSimRad = calcRad(countSim);

  const penalty = 10.0;
  const penaltyRad = Math.PI / 2 - calcRad(penalty);

  const penaltyBasePath = {
    start: { x: -100, y: 0 },
    end: {
      x: -Math.cos(penaltyRad) * RADIUS,
      y: -Math.sin(penaltyRad) * RADIUS,
    },
    stroke: "#FFEEEE",
  };
  const penaltyPath = {
    start: {
      x: -Math.cos(penaltyRad) * RADIUS,
      y: -Math.sin(penaltyRad) * RADIUS,
    },
    end: {
      x: 0,
      y: -100,
    },
    stroke: "#F66570",
  };

  const countSimPath = {
    start: {
      x: 0,
      y: -100,
    },
    end: {
      x: RADIUS * Math.sin(countSimRad),
      y: -RADIUS * Math.sin(Math.PI / 2 - countSimRad),
    },
    stroke: "#3182F6",
  };

  const shapeSimPath = {
    start: {
      x: RADIUS * Math.sin(countSimRad),
      y: -RADIUS * Math.sin(Math.PI / 2 - countSimRad),
    },
    end: {
      x: RADIUS * Math.sin(shapeSimRad + countSimRad),
      y: -RADIUS * Math.sin(Math.PI / 2 - shapeSimRad - countSimRad),
    },
    stroke: "#3182F6",
  };

  const simBasePath = {
    start: {
      x: RADIUS * Math.sin(shapeSimRad + countSimRad),
      y: -RADIUS * Math.sin(Math.PI / 2 - shapeSimRad - countSimRad),
    },
    end: {
      x: 100,
      y: 0,
    },
    stroke: "#E8F3FF",
  };

  const path: Arc[] = [
    penaltyBasePath,
    penaltyPath,
    countSimPath,
    shapeSimPath,
    simBasePath,
  ];
  return (
    <svg width="220" height="220" viewBox="-110 -110 220 220">
      {path.map((p) => (
        <path
          d={`M${p.start.x},${p.start.y} A100,100 0 0 1 ${p.end.x},${p.end.y}`}
          fill="none"
          stroke={`${p.stroke}`}
          strokeWidth="16"
        />
      ))}
    </svg>
  );
};
