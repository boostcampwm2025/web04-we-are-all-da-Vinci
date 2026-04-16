import { ScoreDetailCard } from "@/entities/scoreDetailCard";
import { colors } from "@toss/tds-colors";
import { Paragraph, Post } from "@toss/tds-mobile";

const MyScoreCard = () => {
  return (
    <div className="flex flex-col w-full items-center px-(--page-px) gap-3">
      {/* 내 그림 */}
      <div
        className="mx-(--card-mx) mt-2 rounded-2xl p-3"
        style={{ backgroundColor: colors.grey100 }}
      >
        <img
          src="https://placehold.co/400x400"
          alt="나의 그림"
          className="w-full rounded-xl bg-white object-contain shadow-sm"
        />
      </div>
      <div
        className="h-[160px] w-full"
        style={{ backgroundColor: colors.grey100 }}
      >
        그래프 영역
      </div>
      <div className="flex flex-col items-center gap-1">
        <Paragraph typography="t1">
          <Paragraph.Text fontWeight="bold">77.99</Paragraph.Text>
          <Paragraph.Text typography="t5">점</Paragraph.Text>
        </Paragraph>
        <Post.Paragraph>현재 18,239위</Post.Paragraph>
      </div>

      <ScoreDetailCard />
    </div>
  );
};

export default MyScoreCard;
