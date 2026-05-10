import { ScoreDetailCard } from "@/entities/scoreDetailCard";
import { ArcScoreBar } from "@/shared/ui/arcScoreBar";
import type { MyDrawingResponse } from "@toss/shared";
import { colors } from "@toss/tds-colors";
import { Paragraph } from "@toss/tds-mobile";
import { useEffect, useRef } from "react";
import { drawStrokesOnCanvas } from "../lib/drawStrokesOnCanvas";

interface MyScoreCardProps {
  drawing: MyDrawingResponse;
}

const formatScore = (score: number) => score.toFixed(2);

const CANVAS_SIZE = 400;

const MyScoreCard = ({ drawing }: MyScoreCardProps) => {
  const { similarity } = drawing;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawStrokesOnCanvas(canvas, drawing.strokes);
  }, [drawing]);

  return (
    <div className="flex flex-col w-full items-center px-(--page-px) gap-3">
      <div
        className="mx-(--card-mx) mt-2 w-full rounded-2xl p-3"
        style={{ backgroundColor: colors.grey100 }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          role="img"
          aria-label="나의 그림"
          className="aspect-square w-full rounded-xl bg-white object-contain shadow-sm"
        />
      </div>
      <ArcScoreBar
        penalty={similarity.penalty}
        shapeSimilarity={similarity.shapeSimilarity}
        countSimilarity={similarity.strokeMatchSimilarity}
      />
      <div className="flex flex-col items-center gap-1">
        <Paragraph typography="t1">
          <Paragraph.Text fontWeight="bold">
            {formatScore(drawing.similarity.score)}
          </Paragraph.Text>
          <Paragraph.Text typography="t5">점</Paragraph.Text>
        </Paragraph>
      </div>

      <ScoreDetailCard
        strokeMatchSimilarity={similarity.strokeMatchSimilarity}
        shapeSimilarity={similarity.shapeSimilarity}
        penalty={similarity.penalty}
      />
    </div>
  );
};

export default MyScoreCard;
