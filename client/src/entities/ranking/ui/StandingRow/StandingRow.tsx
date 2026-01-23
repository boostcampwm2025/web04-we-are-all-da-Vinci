import { useIsCurrentUser } from '@/entities/gameRoom/model';
import type { FinalResult } from '@/entities/gameResult/model';
import { RANK_STYLES } from '@/entities/ranking';
import { useCountUp } from '@/shared/lib';
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
  const isCurrentUser = useIsCurrentUser(player.socketId);
  const style =
    RANK_STYLES[finalRank as keyof typeof RANK_STYLES] ?? RANK_STYLES.default;
  const animatedScore = useCountUp(previousScore, player.score, 1200, 300);

  return (
    <div className="relative flex items-center">
      {isCurrentUser && (
        <div className="absolute -left-16 flex items-center gap-1 font-bold text-blue-500">
          ME
          <span className="material-symbols-outlined text-xl">
            arrow_forward
          </span>
        </div>
      )}

      <div
        className={`flex flex-1 items-center gap-4 rounded-xl border-2 p-4 transition-all duration-500 ${isSorted ? style.bg : 'bg-white'} ${isSorted ? style.border : 'border-gray-200'} ${isCurrentUser ? 'ring-2 ring-blue-500 ring-offset-1' : ''} `}
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white ${isSorted ? style.badge : 'bg-gray-300'} `}
        >
          {isSorted && finalRank <= 3 && style.icon ? (
            <span className="material-symbols-outlined">{style.icon}</span>
          ) : (
            finalRank
          )}
        </div>

        <UserAvatar name={player.profileId} size={48} />

        <p
          className={`font-handwriting min-w-0 flex-1 truncate text-xl font-bold ${isSorted ? style.text : 'text-gray-600'} `}
        >
          {player.nickname}
        </p>

        <p
          className={`font-handwriting text-3xl font-bold tabular-nums ${isSorted ? style.text : 'text-gray-600'} `}
        >
          {animatedScore.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          <span className="ml-1 text-2xl">점</span>
        </p>
      </div>
    </div>
  );
};
