import { getDeviceId } from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, TextButton, Top } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
import { MyScoreCard } from "@/entities/myScoreCard";
import { BannerAd } from "@/shared/ui/bannerAd";
import { serverTossApi } from "@/shared/api";
import { Link, useNavigate } from "react-router-dom";
import { Podium } from "@/entities/podium";

const CARD_COUNT = 3;

const DashboardView = () => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [anonymousHash, setAnonymousHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startGame = useCallback(
    async (hash: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const { promptId, strokes } = await serverTossApi.getPrompt();
        navigate("/memorize", {
          state: { promptId, promptStrokes: strokes, anonymousHash: hash },
          replace: true,
        });
      } catch (err) {
        console.error("프롬프트 로드 실패:", err);
        setError("서버에 연결할 수 없어요. 다시 시도해주세요.");
        setIsLoading(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    const init = async () => {
      let hash: string;
      try {
        const { deviceId } = await getDeviceId();
        hash = deviceId;
      } catch {
        hash = "local";
      }
      setAnonymousHash(hash);

      const today = new Date().toISOString().slice(0, 10);
      const lastPlayed = localStorage.getItem(`lastPlayed_${hash}`);

      if (lastPlayed === today) {
        setIsLoading(false);
        return;
      }

      await startGame(hash);
    };

    init();
  }, [startGame]);

  const handleScroll = () => {
    const slider = sliderRef.current;
    if (!slider) return;
    const index = Math.round(slider.scrollLeft / slider.clientWidth);
    setActiveIndex(index);
  };

  const entries = [
    { userId: 1, name: "김동권", totalSimilarity: 80.33 },
    { userId: 2, name: "아주아주긴긴이름", totalSimilarity: 75.33 },
    { userId: 3, name: "조천산", totalSimilarity: 70.33 },
  ];

  if (isLoading && !error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-(--color-grey)">준비 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-(--page-px)">
        <p className="text-center text-(--color-grey)">{error}</p>
        <Button
          size="large"
          onClick={() => anonymousHash && startGame(anonymousHash)}
        >
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
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
          <Podium entries={entries} />
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

      <BannerAd adGroupId="ait-ad-test-banner-id" className="mt-3 mb-3" />

      {/* 하단 버튼 */}
      <div className="flex flex-col gap-3 px-(--page-px) pb-4">
        <Button
          color="primary"
          display="block"
          onClick={() => anonymousHash && startGame(anonymousHash)}
        >
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
