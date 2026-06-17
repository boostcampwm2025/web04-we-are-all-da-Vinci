import {
  DrawingCanvasFrame,
  StaticDrawingCanvas,
} from "@/entities/drawingCanvas";
import { ScoreDetailCard } from "@/entities/scoreDetailCard";
import { serverTossApi } from "@/shared/api";
import { AD_GROUP_IDS } from "@/shared/config";
import { BannerAd } from "@/shared/ui/bannerAd";
import type { ArchiveDayResponse, ArchiveSummaryResponse } from "@toss/shared";
import { colors } from "@toss/tds-colors";
import {
  Asset,
  BottomSheet,
  Badge,
  Button,
  Skeleton,
  TextButton,
  Top,
} from "@toss/tds-mobile";
import { useEffect, useMemo, useRef, useState } from "react";

const QUICK_DATE_COUNT = 5;

const formatScore = (score: number | null) =>
  score == null ? "-" : `${score.toFixed(2)}점`;

const formatStatScore = (score: number | null) =>
  score == null ? "-" : score.toFixed(2);

const formatNumber = (value: number | null) =>
  value == null ? "-" : new Intl.NumberFormat("ko-KR").format(value);

const formatRank = (rank: number | null, participantCount: number | null) => {
  if (rank == null) return "-";
  if (participantCount == null) return `${rank}위`;
  return `${participantCount}명 중 ${rank}위`;
};

const formatSelectedDrawingMeta = (
  createdAt: string,
  participantCount: number | null,
  rank: number | null,
) => {
  const date = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(createdAt));
  const time = formatTime(createdAt);
  const ranking = formatRank(rank, participantCount);
  return `${date} ${time} · ${ranking}`;
};

const scrollToDrawing = (
  slider: HTMLDivElement | null,
  index: number,
  behavior: ScrollBehavior = "smooth",
) => {
  if (!slider) return;
  slider.scrollTo({
    left: index * slider.clientWidth,
    behavior,
  });
};

const formatShortDateLabel = (date: string) => {
  const parsed = new Date(`${date}T00:00:00.000+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    weekday: "short",
  }).format(parsed);
};

const formatMonthLabel = (monthKey: string) => {
  const parsed = new Date(`${monthKey}-01T00:00:00.000+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(parsed);
};

const formatTime = (createdAt: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));

const EmptyArchive = () => (
  <div className="px-(--page-px)">
    <div className="flex h-44 w-full items-center justify-center rounded-(--radius-inner) bg-(--color-card) text-sm text-(--color-grey)">
      아직 아카이브 기록이 없어요
    </div>
  </div>
);

const LockedPromptCanvas = () => (
  <div className="flex aspect-square w-full items-center justify-center rounded-(--radius-inner) bg-(--color-card) px-4 text-center text-sm font-medium text-(--color-grey)">
    내일부터 확인할 수 있어요
  </div>
);

interface SummaryStatProps {
  iconName: string;
  label: string;
  value: string;
  unit: string;
}

const SummaryStat = ({ iconName, label, value, unit }: SummaryStatProps) => (
  <div className="flex min-w-0 flex-col items-center gap-1.5 border-r border-[#E5E8EB] px-1 first:pl-0 last:border-r-0 last:pr-0">
    <Asset.Icon name={iconName} size="small" shape="original" alt="" />
    <div className="text-[11px] font-medium whitespace-nowrap text-(--color-grey)">
      {label}
    </div>
    <div className="min-w-0 whitespace-nowrap text-(--color-black)">
      <span className="text-xl font-bold">{value}</span>
      {unit && <span className="text-sm font-normal">{unit}</span>}
    </div>
  </div>
);

const ArchiveView = () => {
  const [summary, setSummary] = useState<ArchiveSummaryResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<ArchiveDayResponse | null>(
    null,
  );
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isDayLoading, setIsDayLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScoreDetailOpen, setIsScoreDetailOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dayCacheRef = useRef(new Map<string, ArchiveDayResponse>());

  useEffect(() => {
    const controller = new AbortController();

    const loadSummary = async () => {
      try {
        const archiveSummary = await serverTossApi.getArchiveSummary({
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        setSummary(archiveSummary);
        setSelectedDate(archiveSummary.dates[0]?.date ?? null);
        setSelectedMonthKey(archiveSummary.dates[0]?.date.slice(0, 7) ?? null);
      } catch {
        if (!controller.signal.aborted) {
          setErrorMessage("아카이브를 불러오지 못했어요");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSummaryLoading(false);
        }
      }
    };

    loadSummary();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDay(null);
      return;
    }

    const cached = dayCacheRef.current.get(selectedDate);
    if (cached) {
      setSelectedDay(cached);
      setActiveIndex(0);
      return;
    }

    const controller = new AbortController();

    const loadDay = async () => {
      setIsDayLoading(true);
      try {
        const day = await serverTossApi.getArchiveDay(selectedDate, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        dayCacheRef.current.set(selectedDate, day);
        setSelectedDay(day);
        setActiveIndex(0);
      } catch {
        if (!controller.signal.aborted) {
          setSelectedDay(null);
          setErrorMessage("선택한 날짜 기록을 불러오지 못했어요");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsDayLoading(false);
        }
      }
    };

    loadDay();

    return () => controller.abort();
  }, [selectedDate]);

  const selectedSummary =
    summary?.dates.find((date) => date.date === selectedDate) ?? null;
  const selectedDrawing = selectedDay?.drawings[activeIndex] ?? null;
  const cardCount = Math.max(selectedDay?.drawings.length ?? 0, 1);
  const recentDates = summary?.dates.slice(0, QUICK_DATE_COUNT) ?? [];
  const monthKeys = useMemo(() => {
    if (!summary) return [];
    return Array.from(
      new Set(summary.dates.map((date) => date.date.slice(0, 7))),
    );
  }, [summary]);
  const datesInSelectedMonth =
    summary?.dates.filter(
      (date) => date.date.slice(0, 7) === selectedMonthKey,
    ) ?? [];

  const selectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedMonthKey(date.slice(0, 7));
    setIsDatePickerOpen(false);
    setIsScoreDetailOpen(false);
  };

  const handleScroll = () => {
    const slider = sliderRef.current;
    if (!slider) return;
    const index = Math.round(slider.scrollLeft / slider.clientWidth);
    setActiveIndex(Math.min(index, cardCount - 1));
  };

  return (
    <div
      data-no-safe-area-bottom
      className="min-h-0 flex-1 overflow-y-auto bg-(--color-page) pb-[calc(env(safe-area-inset-bottom)+72px)]"
    >
      <Top
        upperGap={16}
        lowerGap={12}
        title={<Top.TitleParagraph size={28}>나의 기록</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>
            오늘까지의 기록을 모아봤어요
          </Top.SubtitleParagraph>
        }
      />

      <section className="px-(--page-px)">
        <div className="grid grid-cols-4 gap-0 rounded-(--radius-card) border border-[#E5E8EB] bg-white py-4 shadow-sm">
          <SummaryStat
            iconName="icon-calendar-check-yellow"
            label="그린 날"
            value={formatNumber(summary?.stats.playDays ?? 0)}
            unit="일"
          />
          <SummaryStat
            iconName="icon-crown-middle"
            label="최고 점수"
            value={formatStatScore(summary?.stats.bestScore ?? null)}
            unit="점"
          />
          <SummaryStat
            iconName="icn-trophy-color"
            label="최고 순위"
            value={formatNumber(summary?.stats.bestRank ?? null)}
            unit={summary?.stats.bestRank == null ? "" : "위"}
          />
          <SummaryStat
            iconName="icon-true-colors"
            label="제출한 그림"
            value={formatNumber(summary?.stats.totalDrawingCount ?? 0)}
            unit="장"
          />
        </div>
      </section>

      <div className="px-(--card-mx)">
        <BannerAd adGroupId={AD_GROUP_IDS.BANNER_LIST} />
      </div>

      <section>
        <div className="px-(--page-px) pb-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-700">날짜별 기록</h2>
            <TextButton size="small" onClick={() => setIsDatePickerOpen(true)}>
              날짜 선택 ›
            </TextButton>
          </div>
          <p className="mt-1 text-sm text-(--color-grey)">
            오늘의 원본 그림은 내일부터 확인할 수 있어요
          </p>
        </div>

        {isSummaryLoading ? (
          <div className="px-(--page-px)">
            <Skeleton pattern="cardOnly" style={{ width: "100%" }} />
          </div>
        ) : summary == null || summary.dates.length === 0 ? (
          <EmptyArchive />
        ) : (
          <>
            <div
              className="flex gap-2 overflow-x-auto px-(--page-px) pb-3"
              style={{ scrollbarWidth: "none" }}
            >
              {recentDates.map((date) => (
                <button
                  key={date.date}
                  type="button"
                  onClick={() => selectDate(date.date)}
                  className="shrink-0 rounded-[8px]! p-2 text-base font-bold transition-colors"
                  style={{
                    backgroundColor:
                      date.date === selectedDate
                        ? "var(--color-toss-blue)"
                        : "var(--color-card)",
                    color:
                      date.date === selectedDate
                        ? "#FFFFFF"
                        : "var(--color-grey)",
                  }}
                >
                  <span className="whitespace-nowrap">
                    {formatShortDateLabel(date.date)}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {errorMessage && (
        <div className="px-(--page-px) text-sm text-(--color-grey)">
          {errorMessage}
        </div>
      )}

      {selectedDate && (
        <section className="mt-4 px-(--page-px)">
          {isDayLoading ? (
            <Skeleton pattern="cardOnly" style={{ width: "100%" }} />
          ) : selectedDay && selectedDrawing ? (
            <div className="relative overflow-hidden rounded-(--radius-card) border border-[#E5E8EB] bg-white px-5 pt-5 pb-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-[30px] leading-none font-bold text-(--color-black)">
                  {selectedDrawing.similarity.score.toFixed(2)}
                </span>
                <span className="text-base text-(--color-black)">점</span>
                {selectedDrawing.isRankedDrawing && (
                  <Badge size="small" color="yellow" variant="weak">
                    BEST
                  </Badge>
                )}
              </div>

              <div className="mt-1 text-sm font-medium text-(--color-grey)">
                {formatSelectedDrawingMeta(
                  selectedDrawing.createdAt,
                  selectedSummary?.participantCount ?? null,
                  selectedSummary?.rank ?? null,
                )}
              </div>

              {cardCount > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="이전 그림 보기"
                    disabled={activeIndex === 0}
                    onClick={() =>
                      scrollToDrawing(sliderRef.current, activeIndex - 1)
                    }
                    className="absolute top-1/2 left-2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full! border border-[#E5E8EB] bg-white text-[36px]! leading-none text-(--color-grey) shadow-sm disabled:opacity-35"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="다음 그림 보기"
                    disabled={activeIndex === cardCount - 1}
                    onClick={() =>
                      scrollToDrawing(sliderRef.current, activeIndex + 1)
                    }
                    className="absolute top-1/2 right-2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full! border border-[#E5E8EB] bg-white text-[36px]! leading-none text-(--color-grey) shadow-sm disabled:opacity-35"
                  >
                    ›
                  </button>
                </>
              )}

              <div
                ref={sliderRef}
                className="mt-5 flex snap-x snap-mandatory overflow-x-scroll"
                style={{ scrollbarWidth: "none" }}
                onScroll={handleScroll}
              >
                {selectedDay.drawings.map((drawing) => (
                  <div
                    key={drawing.drawingId}
                    className="grid w-full shrink-0 snap-start snap-always grid-cols-2 gap-3"
                  >
                    <div className="min-w-0">
                      <DrawingCanvasFrame>
                        {selectedDay.prompt ? (
                          <StaticDrawingCanvas
                            strokes={selectedDay.prompt.strokes}
                            isPrompt
                            ariaLabel="원본 그림"
                          />
                        ) : (
                          <LockedPromptCanvas />
                        )}
                      </DrawingCanvasFrame>
                      <div className="mt-2 text-center text-sm font-medium text-(--color-grey)">
                        원본 그림
                      </div>
                    </div>

                    <div className="min-w-0">
                      <DrawingCanvasFrame>
                        <StaticDrawingCanvas
                          strokes={drawing.strokes}
                          shouldScale
                          ariaLabel="내 그림"
                        />
                      </DrawingCanvasFrame>
                      <div className="mt-2 text-center text-sm font-medium text-(--color-grey)">
                        내 그림
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="my-3 flex justify-center gap-2">
                {Array.from({ length: cardCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${i + 1}번째 그림 보기`}
                    onClick={() => scrollToDrawing(sliderRef.current, i)}
                    className="m-0 inline-flex cursor-pointer appearance-none items-center justify-center border-0 bg-transparent p-0 leading-none"
                  >
                    <span
                      className="block h-2 w-2 rounded-full transition-colors duration-200"
                      style={{
                        backgroundColor:
                          i === activeIndex ? colors.blue500 : colors.grey300,
                      }}
                    />
                  </button>
                ))}
              </div>

              <Button
                variant="weak"
                display="block"
                size="large"
                onClick={() => setIsScoreDetailOpen(true)}
                className="mt-5"
              >
                기억력 점수 분석 보기
              </Button>
            </div>
          ) : null}
        </section>
      )}

      <BottomSheet
        open={isScoreDetailOpen && selectedDrawing != null}
        onClose={() => setIsScoreDetailOpen(false)}
        maxHeight="60vh"
        expandedMaxHeight="60vh"
        header={
          <BottomSheet.Header>
            <div className="flex w-full items-baseline justify-between">
              <span>기억력 점수 상세</span>
              {selectedDrawing && (
                <span className="font-normal">
                  <span className="text-base">총점 </span>
                  <span className="text-xl font-bold text-(--color-toss-blue)">
                    {formatScore(selectedDrawing.similarity.score)}
                  </span>
                </span>
              )}
            </div>
          </BottomSheet.Header>
        }
      >
        {selectedDrawing && (
          <div className="flex w-full flex-col items-center gap-4 px-(--page-px) pt-2 pb-[env(safe-area-inset-bottom)]">
            <ScoreDetailCard
              strokeMatchSimilarity={
                selectedDrawing.similarity.strokeMatchSimilarity
              }
              shapeSimilarity={selectedDrawing.similarity.shapeSimilarity}
              penalty={selectedDrawing.similarity.penalty}
            />
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        header={<BottomSheet.Header>날짜 선택</BottomSheet.Header>}
      >
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-(--page-px) pt-1 pb-[env(safe-area-inset-bottom)]">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {monthKeys.map((monthKey) => (
              <button
                key={monthKey}
                type="button"
                onClick={() => setSelectedMonthKey(monthKey)}
                className="h-11 shrink-0 rounded-[8px]! px-3 text-[14px] font-bold transition-colors"
                style={{
                  backgroundColor:
                    monthKey === selectedMonthKey
                      ? "var(--color-toss-blue)"
                      : "var(--color-card)",
                  color:
                    monthKey === selectedMonthKey
                      ? "#FFFFFF"
                      : "var(--color-grey)",
                }}
              >
                <span className="whitespace-nowrap">
                  {formatMonthLabel(monthKey)}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {datesInSelectedMonth.map((date) => (
              <button
                key={date.date}
                type="button"
                onClick={() => selectDate(date.date)}
                className="h-11 rounded-[8px]! px-3 text-[14px] font-bold transition-colors"
                style={{
                  backgroundColor:
                    date.date === selectedDate
                      ? "var(--color-toss-blue)"
                      : "var(--color-card)",
                  color:
                    date.date === selectedDate
                      ? "#FFFFFF"
                      : "var(--color-grey)",
                }}
              >
                <span className="whitespace-nowrap">
                  {formatShortDateLabel(date.date)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default ArchiveView;
