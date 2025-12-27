import SimilarityProgressBar from '@/components/common/SimilarityProgressBar';

type Color = 'blue' | 'red' | 'green' | 'purple' | 'yellow' | 'indigo' | 'gray';

interface RankingCardProps {
  icon?: string;
  username: string;
  percent: number;
  color?: Color;
  rank?: number;
}

const RankingCard = ({
  icon,
  username,
  percent,
  color = 'blue',
  rank,
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
    red: {
      border: 'border-red-400',
      bg: 'bg-red-50',
      iconBg: 'bg-red-500',
      text: 'text-red-600',
      rankBg: 'bg-red-600',
      rankText: 'text-white',
    },
    green: {
      border: 'border-green-400',
      bg: 'bg-green-50',
      iconBg: 'bg-green-500',
      text: 'text-green-600',
      rankBg: 'bg-green-600',
      rankText: 'text-white',
    },
    purple: {
      border: 'border-purple-400',
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-500',
      text: 'text-purple-600',
      rankBg: 'bg-purple-600',
      rankText: 'text-white',
    },
    yellow: {
      border: 'border-yellow-400',
      bg: 'bg-yellow-50',
      iconBg: 'bg-yellow-500',
      text: 'text-yellow-600',
      rankBg: 'bg-yellow-600',
      rankText: 'text-white',
    },
    indigo: {
      border: 'border-indigo-400',
      bg: 'bg-indigo-50',
      iconBg: 'bg-indigo-500',
      text: 'text-indigo-600',
      rankBg: 'bg-indigo-600',
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

  return (
    <div className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-3`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {rank && (
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full ${colors.rankBg} ${colors.rankText} text-xs font-bold`}
            >
              {rank}위
            </div>
          )}
          {icon && (
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${colors.iconBg}`}
            >
              <span className="material-symbols-outlined text-sm text-white">
                {icon}
              </span>
            </div>
          )}
          <span className="font-handwriting text-sm font-bold">{username}</span>
        </div>
        <span className={`text-lg font-bold ${colors.text}`}>{percent}%</span>
      </div>
      <SimilarityProgressBar color={color} percent={`${percent}%`} />
    </div>
  );
};

export default RankingCard;
