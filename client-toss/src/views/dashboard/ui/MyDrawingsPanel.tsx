import { MyScoreCard } from "@/entities/myScoreCard";
import { MyRankingSection } from "@/entities/ranking";
import type { MyDrawingResponse } from "@toss/shared";
import { colors } from "@toss/tds-colors";
import { Skeleton } from "@toss/tds-mobile";
import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

interface DashboardOutletContext {
  nickname: string;
  myDrawings: MyDrawingResponse[];
  isMyDrawingsLoading: boolean;
}

const MyDrawingsPanel = () => {
  const { nickname, myDrawings, isMyDrawingsLoading } =
    useOutletContext<DashboardOutletContext>();
  const [activeIndex, setActiveIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const cardCount = Math.max(myDrawings.length, 1);

  const handleScroll = () => {
    const slider = sliderRef.current;
    if (!slider) return;
    const index = Math.round(slider.scrollLeft / slider.clientWidth);
    setActiveIndex(Math.min(index, cardCount - 1));
  };

  return (
    <div className="pt-2 pb-2">
      <MyRankingSection nickname={nickname} />
      <div className="mt-2 flex justify-center gap-2 py-1">
        {Array.from({ length: cardCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              const slider = sliderRef.current;
              if (!slider) return;
              slider.scrollTo({
                left: i * slider.clientWidth,
                behavior: "smooth",
              });
            }}
            aria-label={`${i + 1}번째 그림 보기`}
            className="m-0 inline-flex cursor-pointer appearance-none items-center justify-center border-0 bg-transparent p-0 leading-none"
          >
            <span
              className="block h-2 w-2 rounded-full transition-colors duration-200"
              style={{
                backgroundColor:
                  i === activeIndex ? colors.blue500 : colors.grey100,
              }}
            />
          </button>
        ))}
      </div>
      <div
        ref={sliderRef}
        className="flex snap-x snap-mandatory overflow-x-scroll"
        style={{ scrollbarWidth: "none" }}
        onScroll={handleScroll}
      >
        {isMyDrawingsLoading ? (
          <div className="w-full shrink-0 snap-start snap-always px-(--page-px)">
            <Skeleton pattern="listOnly" style={{ width: "100%" }} />
          </div>
        ) : myDrawings.length > 0 ? (
          myDrawings.map((drawing) => (
            <div
              key={drawing.drawingId}
              className="w-full shrink-0 snap-start snap-always"
            >
              <MyScoreCard drawing={drawing} />
            </div>
          ))
        ) : (
          <div className="w-full shrink-0 snap-start snap-always px-(--page-px)">
            <div
              className="flex h-44 w-full items-center justify-center rounded-2xl text-sm"
              style={{
                backgroundColor: colors.grey100,
                color: colors.grey600,
              }}
            >
              아직 제출한 그림이 없어요
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDrawingsPanel;
