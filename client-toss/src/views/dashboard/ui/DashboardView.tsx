import { useRef, useState } from "react";
import { Button, TextButton, Top } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { MyScoreCard } from "@/entities/myScoreCard";

const CARD_COUNT = 3;

const DashboardView = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const slider = sliderRef.current;
    if (!slider) return;
    const index = Math.round(slider.scrollLeft / slider.clientWidth);
    setActiveIndex(index);
  };

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

      {/* 인디케이터 */}
      <div className="flex justify-center gap-2 py-4">
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full transition-colors duration-200"
            style={{
              backgroundColor:
                i === activeIndex ? colors.blue500 : colors.grey100,
            }}
          />
        ))}
      </div>
      {/* 슬라이드할 부분 */}
      <div
        ref={sliderRef}
        className="flex snap-x snap-mandatory overflow-x-scroll"
        style={{ scrollbarWidth: "none" }}
        onScroll={handleScroll}
      >
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <div key={i} className="w-full shrink-0 snap-start snap-always">
            <MyScoreCard />
          </div>
        ))}
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
