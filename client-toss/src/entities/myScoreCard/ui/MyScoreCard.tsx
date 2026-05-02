import { ScoreDetailCard } from "@/entities/scoreDetailCard";
import { ArcScoreBar } from "@/shared/ui/arcScoreBar";
import type { MyDrawingResponse } from "@toss/shared";
import { colors } from "@toss/tds-colors";
import { Paragraph, Post } from "@toss/tds-mobile";

interface MyScoreCardProps {
  drawing: MyDrawingResponse;
}

const formatScore = (score: number) => score.toFixed(2);

const pointsToPolyline = (points: [number[], number[]]) => {
  const [xPoints, yPoints] = points;
  return xPoints.map((x, index) => `${x},${yPoints[index]}`).join(" ");
};

const MyScoreCard = ({ drawing }: MyScoreCardProps) => {
  const { similarity } = drawing;

  return (
    <div className="flex flex-col w-full items-center px-(--page-px) gap-3">
      <div
        className="mx-(--card-mx) mt-2 w-full rounded-2xl p-3"
        style={{ backgroundColor: colors.grey100 }}
      >
        <svg
          viewBox="0 0 256 256"
          role="img"
          aria-label="나의 그림"
          className="aspect-square w-full rounded-xl bg-white object-contain shadow-sm"
        >
          {drawing.strokes.map((stroke, index) => (
            <polyline
              key={`${drawing.drawingId}-${index}`}
              points={pointsToPolyline(stroke.points)}
              fill="none"
              stroke={`rgb(${stroke.color.join(",")})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
          ))}
        </svg>
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
        <Post.Paragraph>
          현재 {drawing.drawRanking.toLocaleString()}위
        </Post.Paragraph>
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
