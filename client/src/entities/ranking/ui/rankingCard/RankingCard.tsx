import { SimilarityProgressBar } from '@/entities/similarity/ui/progress-bar';
import { UserAvatar } from '@/shared/ui';
import { RANK_CHANGE, type RankChange } from '@/entities/ranking';
import { RANK_STYLES } from '@/entities/ranking';

interface RankingCardProps {
  nickname: string;
  profileId: string;
  percent: number;
  rank?: number;
  rankChange?: RankChange;
  isCurrentUser?: boolean;
}

const RankChangeIndicator = ({ change }: { change: RankChange }) => {
  switch (change) {
    case RANK_CHANGE.UP:
      return <span className="text-xs text-green-500">🔺</span>;
    case RANK_CHANGE.DOWN:
      return <span className="text-xs text-red-500">🔻</span>;
    case RANK_CHANGE.NEW:
      return <span className="text-xs text-blue-500">✨</span>;
    case RANK_CHANGE.SAME:
    default:
      return <span className="text-xs text-gray-400">➖</span>;
  }
};

const RankingCard = ({
  nickname,
  profileId,
  percent,
  rank,
  rankChange,
  isCurrentUser = false,
}: RankingCardProps) => {
  const rankStyle =
    rank && RANK_STYLES[rank as 1 | 2 | 3]
      ? RANK_STYLES[rank as 1 | 2 | 3]
      : RANK_STYLES.default;

  const currentUserRing = isCurrentUser
    ? 'ring-2 ring-offset-1 ring-blue-500'
    : '';

  const currentUserStyle = isCurrentUser
    ? 'bg-blue-50 border-blue-400'
    : `${rankStyle.bg} ${rankStyle.border}`;

  return (
    <div
      className={`rounded-xl border-2 p-3 transition-all duration-300 ${currentUserStyle} ${currentUserRing} `}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {rank && (
            <div
              className={`flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold text-white ${rankStyle.badge} `}
            >
              {rank}
            </div>
          )}

          {rankChange && <RankChangeIndicator change={rankChange} />}

          <UserAvatar name={profileId} className="h-8 w-8" />

          <span className="font-handwriting text-sm font-bold">
            {nickname}
            {isCurrentUser && (
              <span className="ml-1 text-xs text-blue-500">(나)</span>
            )}
          </span>
        </div>

        <span className={`text-lg font-bold ${rankStyle.color}`}>
          {percent}%
        </span>
      </div>

      <SimilarityProgressBar
        color={isCurrentUser ? 'blue' : rankStyle.progressColor}
        percent={`${percent}%`}
      />
    </div>
  );
};

export default RankingCard;
