import {
  Border,
  Button,
  Paragraph,
  Post,
  TextButton,
  Top,
} from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";

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
        <div className="flex w-full flex-col items-center gap-4">
          <div
            className="h-[205px] w-full"
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
      <div className="flex flex-col w-full items-center">
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
        <Paragraph typography="t1">
          <Paragraph.Text fontWeight="bold">77.99</Paragraph.Text>
          <Paragraph.Text typography="t5">점</Paragraph.Text>
        </Paragraph>
        <Post.Paragraph>현재 18,239위</Post.Paragraph>

        <div className="w-full">
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
      </div>

      {/* 하단 버튼 */}
      <Button color="primary" display="block">
        한번 더 참여하고 포인트 받기
      </Button>
      <Button color="primary" display="block" variant="weak">
        공유하고 포인트 받기
      </Button>
    </div>
  );
};

export default DashboardView;
