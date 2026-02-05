import type { FinalResult } from '@/entities/gameResult';
import { useIsCurrentUser } from '@/entities/gameRoom';
import { RANK_STYLES } from '@/entities/ranking';
import { useCountUp } from '@/shared/model';
import { UserAvatar } from '@/shared/ui';

interface StandingRowProps {
  player: FinalResult;
  previousScore: number;
  finalRank: number;
  isSorted: boolean;
}

export const StandingRow = ({
  player,
  previousScore,
  finalRank,
  isSorted,
}: StandingRowProps) => {
  const isCurrentUser = useIsCurrentUser(player.profileId);
  const style =
    RANK_STYLES[finalRank as keyof typeof RANK_STYLES] ?? RANK_STYLES.default;
  const animatedScore = useCountUp(previousScore, player.score, 1200, 300);

  return (
    <div className="relative flex items-center">
      {isCurrentUser && (
        <div className="absolute -left-8 flex gap-1 text-xl font-bold text-blue-500 md:-left-16">
          나
          <div className="hidden text-xl md:block">
            <span className="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>
      )}

      <div
        className={`flex flex-1 items-center gap-2 rounded-xl border-2 p-1 transition-all duration-500 md:gap-4 md:p-4 ${isSorted ? style.bg : 'bg-white'} ${isSorted ? style.border : 'border-gray-200'} ${isCurrentUser ? 'ring-2 ring-blue-500 ring-offset-1' : ''} `}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white md:h-10 md:w-10 md:text-lg ${isSorted ? style.badge : 'bg-gray-300'} `}
        >
          {isSorted && finalRank <= 3 && style.icon ? (
            <span className="material-symbols-outlined">{style.icon}</span>
          ) : (
            finalRank
          )}
        </div>

        <UserAvatar name={player.profileId} className="h-8 w-8" />

        <p
          className={`font-handwriting min-w-0 flex-1 truncate text-base font-bold md:text-xl ${isSorted ? style.text : 'text-gray-600'} `}
        >
          {player.nickname}
        </p>

        <p
          className={`font-handwriting text-xl font-bold tabular-nums md:text-3xl ${isSorted ? style.text : 'text-gray-600'} `}
        >
          {animatedScore.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          <span className="ml-1 text-base md:text-2xl">점</span>
        </p>
      </div>
    </div>
  );
};
