import { useGameStore, useIsCurrentUser, useCurrentPlayer } from '@/entities/gameRoom/model';
import { Timer } from '@/entities/timer';
import { UserAvatar, RoundBadge } from '@/shared/ui';
import { DrawingHeader } from '@/entities/drawing';
import type { FinalResult } from '@/entities/gameResult/model';
import { useEffect, useMemo, useRef, useState } from 'react';

const RANK_STYLES = {
  1: {
    bg: 'bg-surface-warm',
    border: 'border-rank-gold',
    badge: 'bg-rank-gold',
    text: 'text-rank-gold-text',
    icon: 'emoji_events',
  },
  2: {
    bg: 'bg-surface-muted',
    border: 'border-rank-silver',
    badge: 'bg-rank-silver',
    text: 'text-rank-silver-text',
    icon: 'military_tech',
  },
  3: {
    bg: 'bg-surface-warm',
    border: 'border-rank-bronze',
    badge: 'bg-rank-bronze',
    text: 'text-rank-bronze-text',
    icon: 'military_tech',
  },
  default: {
    bg: 'bg-surface-base',
    border: 'border-stroke-default',
    badge: 'bg-gray-400',
    text: 'text-content-secondary',
    icon: '',
  },
};

const SORT_DELAY = 1500;

const useCountUp = (
  start: number,
  end: number,
  duration = 1000,
  delay = 0
) => {
  const [count, setCount] = useState(start);

  useEffect(() => {
    setCount(start);

    const timeout = setTimeout(() => {
      const startTime = Date.now();
      const diff = end - start;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - (1 - progress) * (1 - progress);
        setCount(start + eased * diff);

        if (progress < 1) requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeout);
  }, [start, end, duration, delay]);

  return count;
};

/* ---------------- Row ---------------- */
const StandingRow = ({
  player,
  previousScore,
  finalRank,
  isSorted,
}: {
  player: FinalResult;
  previousScore: number;
  finalRank: number;
  isSorted: boolean;
}) => {
  const isCurrentUser = useIsCurrentUser(player.socketId);
  const style = RANK_STYLES[finalRank as keyof typeof RANK_STYLES] ?? RANK_STYLES.default;
  const animatedScore = useCountUp(previousScore, player.score, 1200, 300);

  return (
    <div className="relative flex items-center">
      {isCurrentUser && (
        <div className="absolute -left-16 flex items-center gap-1 font-bold text-blue-500">
          ME
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </div>
      )}

      <div
        className={`flex flex-1 items-center gap-4 rounded-xl border-2 p-4 transition-all duration-500
          ${isSorted ? style.bg : 'bg-white'}
          ${isSorted ? style.border : 'border-gray-200'}
          ${isCurrentUser ? 'shadow-[0_0_0_3px_rgba(59,130,246,0.5)]' : ''}
        `}
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white
            ${isSorted ? style.badge : 'bg-gray-300'}
          `}
        >
          {isSorted && finalRank <= 3 && style.icon ? (
            <span className="material-symbols-outlined">{style.icon}</span>
          ) : (
            finalRank
          )}
        </div>

        <UserAvatar name={player.profileId} size={48} />

        <p
          className={`min-w-0 flex-1 truncate font-handwriting text-xl font-bold
            ${isSorted ? style.text : 'text-gray-600'}
          `}
        >
          {player.nickname}
        </p>

        <p
          className={`font-handwriting text-2xl font-bold tabular-nums
            ${isSorted ? style.text : 'text-gray-600'}
          `}
        >
          {animatedScore.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}

          <span className="ml-1 text-sm">점</span>
        </p>
      </div>
    </div>
  );
};

/* ---------------- Main ---------------- */
export const RoundStanding = () => {
  const standingResults = useGameStore((s) => s.standingResults);
  const previousStandingResults = useGameStore((s) => s.previousStandingResults);
  const currentRound = useGameStore((s) => s.currentRound);

  const [displayResults, setDisplayResults] = useState<FinalResult[]>([]);
  const [isSorted, setIsSorted] = useState(false);
  const currentPlayer = useCurrentPlayer();

  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const previousScoreMap = useMemo(() => {
    return new Map(
      previousStandingResults.map((p) => [p.socketId, p.score])
    );
  }, [previousStandingResults]);

  /* 초기 렌더 */
  useEffect(() => {
    if (previousStandingResults.length > 0) {
      setDisplayResults(previousStandingResults);
    } else if (standingResults.length > 0) {
      setDisplayResults(standingResults.map((p) => ({ ...p, score: 0 })));
    }
  }, [previousStandingResults, standingResults]);

  /* FLIP */
  const playFlip = (next: FinalResult[]) => {
    const prevRects = new Map<string, DOMRect>();

    rowRefs.current.forEach((el, id) => {
      prevRects.set(id, el.getBoundingClientRect());
    });

    setDisplayResults(next);

    requestAnimationFrame(() => {
      rowRefs.current.forEach((el, id) => {
        const prev = prevRects.get(id);
        if (!prev) return;

        const dy = prev.top - el.getBoundingClientRect().top;
        if (dy === 0) return;

        el.style.transform = `translateY(${dy}px)`;
        el.style.transition = 'transform 0s';

        requestAnimationFrame(() => {
          el.style.transform = '';
          el.style.transition =
            'transform 700ms cubic-bezier(0.34,1.56,0.64,1)';
        });
      });
    });
  };

  /* 정렬 타이밍 */
  useEffect(() => {
    if (!standingResults.length) return;

    const timer = setTimeout(() => {
      const sorted = [...standingResults].sort(
        (a, b) => b.score - a.score
      );
      playFlip(sorted);
      setIsSorted(true);
    }, SORT_DELAY);

    return () => clearTimeout(timer);
  }, [standingResults]);

  // 현재 내 등수 계산 (1-based index)
  const myRank = useMemo(() => {
    if (!currentPlayer) return -1;
    const index = displayResults.findIndex(
      (p) => p.socketId === currentPlayer.socketId
    );
    return index !== -1 ? index + 1 : -1;
  }, [displayResults, currentPlayer]);

  // 등수에 따른 메시지
  const rankMessage = useMemo(() => {
    if (myRank === -1) return '';
    if (myRank === 1) return `현재 ${myRank}등이에요! 이 기세를 유지하세요! 👑`;
    if (myRank <= 3) return `현재 ${myRank}등이에요! 1등이 코앞이에요! 🔥`;
    return `현재 ${myRank}등이에요! 조금만 더 노력해서 1등 해봐요! 👊`;
  }, [myRank]);

  return (
    <>
      <Timer />

      <div className="page-center h-screen">
        <div className="page-container">

          <DrawingHeader
            title="현재 순위"
            roundBadge={<RoundBadge round={currentRound} />}
          />

          {/* 랭킹 메시지 추가 */}
          {isSorted && rankMessage && (
            <div className="mb-4 text-center">
              <p className="font-handwriting animate-bounce text-2xl font-bold text-blue-600 transition-opacity duration-500">
                {rankMessage}
              </p>
            </div>
          )}

          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 overflow-y-auto p-3 pl-20">
            {displayResults.map((player, index) => (
              <div
                key={player.socketId}
                ref={(el) => {
                  if (el) rowRefs.current.set(player.socketId, el);
                  else rowRefs.current.delete(player.socketId);
                }}
              >
                <StandingRow
                  player={player}
                  previousScore={previousScoreMap.get(player.socketId) ?? 0}
                  finalRank={index + 1}
                  isSorted={isSorted}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
