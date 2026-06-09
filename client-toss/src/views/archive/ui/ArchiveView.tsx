import {
  DrawingCanvasFrame,
  ReplayDrawingCanvas,
  StaticDrawingCanvas,
} from "@/entities/drawingCanvas";
import { PhaseHeader } from "@/entities/phaseHeader";
import { ScoreDetailCard } from "@/entities/scoreDetailCard";
import { serverTossApi } from "@/shared/api";
import { Score } from "@/shared/ui/score";
import type { ArchiveDayResponse, ArchiveSummaryResponse } from "@toss/shared";
import { colors } from "@toss/tds-colors";
import {
  BottomSheet,
  Button,
  ListHeader,
  Skeleton,
  TextButton,
} from "@toss/tds-mobile";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const formatScore = (score: number | null) =>
  score == null ? "-" : `${score.toFixed(2)}점`;

const formatRank = (rank: number | null, participantCount: number | null) => {
  if (rank == null) return "-";
  if (participantCount == null) return `${rank}위`;
  return `${participantCount}명 중 ${rank}위`;
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
    오늘 그림은 내일부터 확인할 수 있어요.
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
  const recentDates = summary?.dates.slice(0, 3) ?? [];
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
      className="min-h-0 flex-1 overflow-y-auto bg-(--color-page) pb-[env(safe-area-inset-bottom)]"
    >
      <PhaseHeader
        title="내 그림 아카이브"
        description="어제까지 그린 그림을 모아봤어요"
      />

      <section className="px-(--page-px)">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-(--radius-inner) bg-(--color-card) px-4 py-3">
            <div className="text-xs text-(--color-grey)">그린 날</div>
            <div className="mt-1 text-xl font-bold text-(--color-black)">
              {summary?.stats.playDays ?? 0}일
            </div>
          </div>
          <div className="rounded-(--radius-inner) bg-(--color-card) px-4 py-3">
            <div className="text-xs text-(--color-grey)">최고 점수</div>
            <div className="mt-1 text-xl font-bold text-(--color-black)">
              {formatScore(summary?.stats.bestScore ?? null)}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <ListHeader
          title={
            <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
              날짜별 기록
            </ListHeader.TitleParagraph>
          }
          description={
            <ListHeader.DescriptionParagraph>
              오늘 기록은 내일부터 볼 수 있어요
            </ListHeader.DescriptionParagraph>
          }
          descriptionPosition="bottom"
        />

        {isSummaryLoading ? (
          <div className="px-(--page-px)">
            <Skeleton pattern="cardOnly" style={{ width: "100%" }} />
          </div>
        ) : summary == null || summary.dates.length === 0 ? (
          <EmptyArchive />
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto] gap-2 px-(--page-px) pb-3">
              <div className="flex min-w-0 gap-2">
                {recentDates.map((date) => (
                  <Button
                    key={date.date}
                    size="small"
                    variant={date.date === selectedDate ? "fill" : "weak"}
                    onClick={() => selectDate(date.date)}
                  >
                    {formatShortDateLabel(date.date)}
                  </Button>
                ))}
              </div>
              <TextButton
                size="xsmall"
                variant="underline"
                onClick={() => setIsDatePickerOpen(true)}
              >
                날짜 선택하기
              </TextButton>
            </div>

            {selectedSummary && (
              <div className="grid grid-cols-2 gap-2 px-(--page-px) pb-3">
                <div className="rounded-(--radius-inner) bg-(--color-card) px-4 py-3">
                  <div className="text-xs text-(--color-grey)">최종 순위</div>
                  <div className="mt-1 text-base font-bold text-(--color-black)">
                    {formatRank(
                      selectedSummary.rank,
                      selectedSummary.participantCount,
                    )}
                  </div>
                </div>
                <div className="rounded-(--radius-inner) bg-(--color-card) px-4 py-3">
                  <div className="text-xs text-(--color-grey)">제출한 그림</div>
                  <div className="mt-1 text-base font-bold text-(--color-black)">
                    {selectedSummary.drawingCount}장
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {errorMessage && (
        <div className="px-(--page-px) text-sm text-(--color-grey)">
          {errorMessage}
        </div>
      )}

      {selectedDate && (
        <section className="mt-2">
          {isDayLoading ? (
            <div className="px-(--page-px)">
              <Skeleton pattern="cardOnly" style={{ width: "100%" }} />
            </div>
          ) : selectedDay && selectedDrawing ? (
            <>
              <div className="flex justify-center gap-2 py-1">
                {Array.from({ length: cardCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${i + 1}번째 그림 보기`}
                    onClick={() => {
                      const slider = sliderRef.current;
                      if (!slider) return;
                      slider.scrollTo({
                        left: i * slider.clientWidth,
                        behavior: "smooth",
                      });
                    }}
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

              <div
                ref={sliderRef}
                className="flex snap-x snap-mandatory overflow-x-scroll"
                style={{ scrollbarWidth: "none" }}
                onScroll={handleScroll}
              >
                {selectedDay.drawings.map((drawing) => (
                  <div
                    key={drawing.drawingId}
                    className="w-full shrink-0 snap-start snap-always px-(--card-mx)"
                  >
                    <DrawingCanvasFrame
                      as="button"
                      onClick={() => setIsScoreDetailOpen(true)}
                      ariaLabel="점수 상세 보기"
                    >
                      <ReplayDrawingCanvas
                        strokes={drawing.strokes}
                        loop
                        speed={0}
                        ariaLabel="아카이브 그림"
                      />
                    </DrawingCanvasFrame>
                    <div className="mt-3 flex flex-col items-center gap-1">
                      <Score value={drawing.similarity.score} size="s" />
                      <div className="text-xs text-(--color-grey)">
                        {formatTime(drawing.createdAt)}
                        {drawing.isRankedDrawing ? " · 최고 점수" : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <ListHeader
                  title={
                    <ListHeader.TitleParagraph
                      typography="t5"
                      fontWeight="bold"
                    >
                      원본과 비교
                    </ListHeader.TitleParagraph>
                  }
                />
                <div className="grid grid-cols-2 gap-2 px-(--page-px)">
                  <DrawingCanvasFrame>
                    {selectedDay.prompt ? (
                      <StaticDrawingCanvas
                        strokes={selectedDay.prompt.strokes}
                        isPrompt
                        ariaLabel="제시그림"
                      />
                    ) : (
                      <LockedPromptCanvas />
                    )}
                  </DrawingCanvasFrame>
                  <DrawingCanvasFrame>
                    <StaticDrawingCanvas
                      strokes={selectedDrawing.strokes}
                      shouldScale
                      ariaLabel="내 그림"
                    />
                  </DrawingCanvasFrame>
                </div>
              </div>
            </>
          ) : null}
        </section>
      )}

      <div className="mt-6 px-(--page-px)">
        <Link to="/">
          <Button variant="weak" display="block" size="large">
            돌아가기
          </Button>
        </Link>
      </div>

      <BottomSheet
        open={isScoreDetailOpen && selectedDrawing != null}
        onClose={() => setIsScoreDetailOpen(false)}
        maxHeight="60vh"
        expandedMaxHeight="60vh"
        header={
          <BottomSheet.Header>
            <div className="flex w-full items-baseline justify-between">
              <span>점수 분석</span>
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
              <Button
                key={monthKey}
                size="small"
                variant={monthKey === selectedMonthKey ? "fill" : "weak"}
                onClick={() => setSelectedMonthKey(monthKey)}
              >
                {formatMonthLabel(monthKey)}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {datesInSelectedMonth.map((date) => (
              <Button
                key={date.date}
                size="small"
                variant={date.date === selectedDate ? "fill" : "weak"}
                onClick={() => selectDate(date.date)}
              >
                {formatShortDateLabel(date.date)}
              </Button>
            ))}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default ArchiveView;
