import type { PlayerResult } from '../model/types';

interface PodiumPlayerProps {
  player: PlayerResult;
  position: 'first' | 'second' | 'third';
}

const PODIUM_CONFIG = {
  first: {
    order: 'order-1 sm:order-2',
    size: 'h-28 w-28 sm:h-32 sm:w-32',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-600',
    nameSize: 'text-3xl',
    scoreSize: 'text-2xl',
    podiumHeight: 'h-28 sm:h-32',
    podiumWidth: 'w-20 sm:w-24',
    podiumBg: 'bg-yellow-100',
    podiumBorder: 'border-yellow-200',
    badge: {
      bg: 'bg-yellow-500',
      text: '#1',
    },
    showTrophy: true,
    showRankNumber: true,
  },
  second: {
    order: 'order-2 sm:order-1',
    size: 'h-20 w-20 sm:h-24 sm:w-24',
    borderColor: 'border-indigo-400',
    textColor: 'text-indigo-600',
    nameSize: 'text-xl',
    scoreSize: 'text-lg',
    podiumHeight: 'h-20 sm:h-24',
    podiumWidth: 'w-16 sm:w-20',
    podiumBg: 'bg-indigo-100',
    podiumBorder: 'border-indigo-200',
    badge: {
      bg: 'bg-indigo-500',
      text: '#2',
    },
    showTrophy: false,
    showRankNumber: false,
  },
  third: {
    order: 'order-3',
    size: 'h-20 w-20 sm:h-24 sm:w-24',
    borderColor: 'border-pink-400',
    textColor: 'text-pink-600',
    nameSize: 'text-xl',
    scoreSize: 'text-lg',
    podiumHeight: 'h-14 sm:h-16',
    podiumWidth: 'w-16 sm:w-20',
    podiumBg: 'bg-pink-100',
    podiumBorder: 'border-pink-200',
    badge: {
      bg: 'bg-pink-400',
      text: '#3',
    },
    showTrophy: false,
    showRankNumber: false,
  },
};

const MEDAL_EMOJI = {
  first: '🏆',
  second: '🥈',
  third: '🥉',
};

export const PodiumPlayer = ({ player, position }: PodiumPlayerProps) => {
  const config = PODIUM_CONFIG[position];

  return (
    <div className={`${config.order} flex flex-col items-center`}>
      <div className="group relative">
        <div
          className={`${config.size} relative mb-3 flex items-center justify-center overflow-hidden rounded-full border-4 ${config.borderColor} bg-white shadow-${position === 'first' ? 'xl' : 'lg'}`}
        >
          {player.avatar ? (
            <img
              alt={`${player.nickname} avatar`}
              className="h-full w-full object-cover"
              src={player.avatar}
            />
          ) : (
            <span className="text-3xl select-none">
              {MEDAL_EMOJI[position]}
            </span>
          )}
        </div>

        {config.badge && (
          <div
            className={`absolute -top-2 -right-2 ${config.badge.bg} rounded-full px-2 py-1 text-xs font-bold text-white`}
          >
            {config.badge.text}
          </div>
        )}

        {position === 'first' && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 transform rounded-full bg-yellow-400 px-4 py-1 font-bold whitespace-nowrap text-gray-800 shadow-sm">
            오늘의 다빈치
          </div>
        )}
      </div>

      <h3
        className={`font-handwriting ${config.nameSize} font-bold text-gray-800 ${position === 'first' ? 'mt-4' : ''}`}
      >
        {player.nickname}
        {player.isCurrentUser && ' (You)'}
      </h3>

      <p className={`${config.textColor} ${config.scoreSize} font-bold`}>
        {player.score.toLocaleString()} pts
      </p>

      <div
        className={`${config.podiumHeight} ${config.podiumWidth} ${config.podiumBg} mt-2 rounded-t-lg border-x-2 border-t-2 ${config.podiumBorder} ${position === 'first' ? 'flex items-end justify-center pb-2' : ''}`}
      ></div>
    </div>
  );
};
