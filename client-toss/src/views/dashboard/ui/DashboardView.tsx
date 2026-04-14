import { Button, Paragraph, Post, TextButton, Top } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { ScoreDetailCard } from "@/entities/scoreDetailCard";

const DashboardView = () => {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {/* 랭킹 영역 */}
      <div>
        <Top
          title={<Top.TitleParagraph>오늘의 다빈치</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph>명예의 전당</Top.SubtitleParagraph>
          }
        />
        <div className="flex w-full flex-col items-center gap-4 px-6">
          {/* 랭킹 TOP3 */}
          <div
            className="h-[205px] w-full rounded-xl"
            style={{ backgroundColor: colors.grey100 }}
          >
            TOP3
          </div>
          <TextButton size="small" variant="arrow">
            TOP 100 랭킹 보러가기
          </TextButton>
        </div>
      </div>
      {/* 나의 결과 영역 */}
      <Top title={<Top.TitleParagraph>나의 결과</Top.TitleParagraph>} />
      {/* 슬라이드할 부분 */}
      <div className="flex flex-col w-full items-center px-6 gap-3">
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

      {/* 하단 버튼 */}
      <div className="px-6 flex flex-col gap-3 mt-9">
        <Button color="primary" display="block">
          한번 더 참여하고 포인트 받기
        </Button>
        <Button color="primary" display="block" variant="weak">
          공유하고 포인트 받기
        </Button>
      </div>
    </div>
  );
};

export default DashboardView;
