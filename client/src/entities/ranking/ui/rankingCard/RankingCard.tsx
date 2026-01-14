import { SimilarityProgressBar } from '@/entities/similarity/ui/progress-bar';
import { RANK_CHANGE, type PlayerColor, type RankChange } from '../../model';

interface RankingCardProps {
  nickname: string;
  percent: number;
  color?: PlayerColor;
  rank?: number;
  rankChange?: RankChange;
  isCurrentUser?: boolean;
}

const RankChangeIndicator = ({ change }: { change: RankChange }) => {
  switch (change) {
    case RANK_CHANGE.UP:
      return (
        <span className="text-xs text-green-500" title="순위 상승">
          🔺
        </span>
      );
    case RANK_CHANGE.DOWN:
      return (
        <span className="text-xs text-red-500" title="순위 하락">
          🔻
        </span>
      );
    case RANK_CHANGE.NEW:
      return (
        <span className="text-xs text-blue-500" title="신규 진입">
          ✨
        </span>
      );
    case RANK_CHANGE.SAME:
    default:
      return (
        <span className="text-xs text-gray-400" title="순위 유지">
          ➖
        </span>
      );
  }
};

const RankingCard = ({
  nickname,
  percent,
  color = 'blue',
  rank,
  rankChange,
  isCurrentUser = false,
}: RankingCardProps) => {
  const colorClasses = {
    blue: {
      border: 'border-blue-400',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-500',
      text: 'text-blue-600',
      rankBg: 'bg-blue-600',
      rankText: 'text-white',
    },
    gray: {
      border: 'border-gray-400',
      bg: 'bg-gray-50',
      iconBg: 'bg-gray-500',
      text: 'text-gray-600',
      rankBg: 'bg-gray-600',
      rankText: 'text-white',
    },
  };

  const colors = colorClasses[color];

  // 현재 사용자일 경우 더 눈에 띄는 스타일 적용
  const currentUserStyles = isCurrentUser
    ? 'ring-2 ring-offset-1 ring-blue-500'
    : '';

  return (
    <div
      className={`rounded-xl border-2 ${colors.border} ${colors.bg} ${currentUserStyles} p-3 transition-all duration-300`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {rank && (
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full ${colors.rankBg} ${colors.rankText} text-xs font-bold`}
            >
              {rank}위
            </div>
          )}
          {rankChange && <RankChangeIndicator change={rankChange} />}
          <span className="font-handwriting text-sm font-bold">
            {nickname}
            {isCurrentUser && (
              <span className="ml-1 text-xs text-blue-500">(나)</span>
            )}
          </span>
        </div>
        <span className={`text-lg font-bold ${colors.text}`}>{percent}%</span>
      </div>
      <SimilarityProgressBar color={color} percent={`${percent}%`} />
    </div>
  );
};

export default RankingCard;
