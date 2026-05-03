import { colors } from "@toss/tds-colors";
import { Border, Paragraph } from "@toss/tds-mobile";

interface ScoreDetailCardProps {
  strokeMatchSimilarity: number;
  shapeSimilarity: number;
  penalty: number;
}

const formatScore = (score: number) => score.toFixed(2);

const ScoreDetailCard = ({
  strokeMatchSimilarity,
  shapeSimilarity,
  penalty,
}: ScoreDetailCardProps) => {
  const strokeMatchText =
    strokeMatchSimilarity >= 80
      ? "제시 그림과 선 모양이 거의 같아요"
      : strokeMatchSimilarity >= 50
        ? "제시 그림과 선 모양이 비슷해요"
        : "제시 그림과 선 모양에 차이가 있어요";

  const shapeText =
    shapeSimilarity >= 8
      ? "제시 그림과 형태가 거의 같아요"
      : shapeSimilarity >= 5
        ? "제시 그림과 형태가 비슷해요"
        : "제시 그림과 형태에 차이가 있어요";

  const penaltyText =
    penalty === 0 ? "실수 없이 깔끔하게 그렸어요" : "일부 감점이 적용됐어요";

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Paragraph typography="t5">
            <Paragraph.Text fontWeight="medium">선 유사도</Paragraph.Text>
          </Paragraph>
          <Paragraph typography="t6">
            <Paragraph.Text color={colors.grey500}>
              {strokeMatchText}
            </Paragraph.Text>
          </Paragraph>
        </div>
        <Paragraph typography="t5">
          <Paragraph.Text fontWeight="medium" color={colors.blue500}>
            +{formatScore(strokeMatchSimilarity)}점
          </Paragraph.Text>
        </Paragraph>
      </div>
      <Border variant="full" />
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Paragraph typography="t5">
            <Paragraph.Text fontWeight="medium">형태 유사도</Paragraph.Text>
          </Paragraph>
          <Paragraph typography="t6">
            <Paragraph.Text color={colors.grey500}>{shapeText}</Paragraph.Text>
          </Paragraph>
        </div>
        <Paragraph typography="t5">
          <Paragraph.Text fontWeight="medium" color={colors.blue500}>
            +{formatScore(shapeSimilarity)}점
          </Paragraph.Text>
        </Paragraph>
      </div>
      <Border variant="full" />
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Paragraph typography="t5">
            <Paragraph.Text fontWeight="medium">패널티</Paragraph.Text>
          </Paragraph>
          <Paragraph typography="t6">
            <Paragraph.Text color={colors.grey500}>
              {penaltyText}
            </Paragraph.Text>
          </Paragraph>
        </div>
        <Paragraph typography="t5">
          <Paragraph.Text fontWeight="medium" color={colors.red500}>
            -{formatScore(penalty)}점
          </Paragraph.Text>
        </Paragraph>
      </div>
    </div>
  );
};

export default ScoreDetailCard;
