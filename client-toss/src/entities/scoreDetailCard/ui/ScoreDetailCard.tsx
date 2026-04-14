import { colors } from "@toss/tds-colors";
import { Border, Paragraph } from "@toss/tds-mobile";

const ScoreDetailCard = () => {
  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Paragraph typography="t5">
            <Paragraph.Text fontWeight="medium">선 유사도</Paragraph.Text>
          </Paragraph>
          <Paragraph typography="t6">
            <Paragraph.Text color={colors.grey500}>
              선의 개수가 유사해요
            </Paragraph.Text>
          </Paragraph>
        </div>
        <Paragraph typography="t5">
          <Paragraph.Text fontWeight="medium" color={colors.blue500}>
            +80.55점
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
            <Paragraph.Text color={colors.grey500}>
              전체 그림의 형태가 제시 그림과 달라요
            </Paragraph.Text>
          </Paragraph>
        </div>
        <Paragraph typography="t5">
          <Paragraph.Text fontWeight="medium" color={colors.blue500}>
            +80.55점
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
              실수 없이 깔끔하게 그렸어요
            </Paragraph.Text>
          </Paragraph>
        </div>
        <Paragraph typography="t5">
          <Paragraph.Text fontWeight="medium" color={colors.red500}>
            -10.00점
          </Paragraph.Text>
        </Paragraph>
      </div>
    </div>
  );
};

export default ScoreDetailCard;
