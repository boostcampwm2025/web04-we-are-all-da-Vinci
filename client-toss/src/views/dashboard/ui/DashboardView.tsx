import { useRef, useState } from "react";
import { Button, TextButton, Toast, Top } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { MyScoreCard, useMyDrawings } from "@/entities/myScoreCard";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Link, useNavigate } from "react-router-dom";
import { Podium } from "@/entities/podium";
import { RewardAd } from "@/shared/ui/rewardAd";
import { usePlayChance } from "@/feature/playChance";

const DashboardView = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { myDrawings, isLoading } = useMyDrawings();
  const {
    hasChance,
    isLoading: isChanceLoading,
    charge,
    consume,
  } = usePlayChance();
  const cardCount = Math.max(myDrawings.length, 1);

  const handleScroll = () => {
    const slider = sliderRef.current;
    if (!slider) return;
    const index = Math.round(slider.scrollLeft / slider.clientWidth);
    setActiveIndex(Math.min(index, cardCount - 1));
  };

  const startGame = async () => {
    if (isStartingGame) return;

    setIsStartingGame(true);

    try {
      const consumed = await consume();
      if (!consumed) return;

      navigate("/memorize");
    } catch {
      setToastOpen(true);
    } finally {
      setIsStartingGame(false);
    }
  };

  const handleReward = async () => {
    if (isStartingGame) return;

    setIsStartingGame(true);

    try {
      await charge();
      const consumed = await consume();
      if (!consumed) return;

      navigate("/memorize");
    } catch {
      setToastOpen(true);
    } finally {
      setIsStartingGame(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Toast
        position="top"
        open={toastOpen}
        text="일시적 오류가 발생했어요"
        leftAddon={<Toast.Icon name="icon-warning-circle-red-opacity-small" />}
        duration={3000}
        onClose={() => setToastOpen(false)}
      />
      {/* 랭킹 영역 */}
      <div>
        <Top
          title={<Top.TitleParagraph>오늘의 다빈치</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph>명예의 전당</Top.SubtitleParagraph>
          }
        />
        <div className="flex w-full flex-col items-center gap-4 px-(--page-px)">
          {/* 랭킹 TOP3 */}
          <Podium />
          <Link to="/ranking">
            <TextButton size="small" variant="arrow">
              TOP 100 랭킹 보러가기
            </TextButton>
          </Link>
        </div>
      </div>

      {/* 나의 결과 영역 */}
      <Top title={<Top.TitleParagraph>나의 결과</Top.TitleParagraph>} />

      {/* 인디케이터 */}
      <div className="flex justify-center gap-2 py-4">
        {Array.from({ length: cardCount }).map((_, i) => (
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
        {isLoading ? (
          <div className="w-full shrink-0 snap-start snap-always px-(--page-px)">
            <div
              className="h-96 w-full rounded-2xl"
              style={{ backgroundColor: colors.grey100 }}
            />
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

      <BannerAd adGroupId="ait-ad-test-banner-id" className="mt-3 mb-3" />

      {/* 하단 버튼 */}
      <div className="px-(--page-px) flex flex-col gap-3">
        {isChanceLoading ? (
          <Button color="primary" display="block" loading disabled>
            플레이 기회 확인 중
          </Button>
        ) : hasChance ? (
          <Button
            color="primary"
            display="block"
            loading={isStartingGame}
            disabled={isStartingGame}
            onClick={startGame}
          >
            플레이하기
          </Button>
        ) : (
          <RewardAd
            adGroupId="ait-ad-test-rewarded-id"
            onReward={handleReward}
            text="광고 보고 기회 충전하기"
          />
        )}
        <Button color="primary" display="block" variant="weak">
          공유하고 포인트 받기
        </Button>
      </div>
    </div>
  );
};

export default DashboardView;
