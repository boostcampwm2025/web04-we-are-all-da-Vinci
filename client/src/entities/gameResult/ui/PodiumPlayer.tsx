import { UserAvatar } from '@/shared/ui';
import type { FinalResult } from '../model/types';

interface PodiumPlayerProps {
  player: FinalResult;
  position: 'first' | 'second' | 'third';
}

const PODIUM_CONFIG = {
  first: {
    order: 'order-1 sm:order-2',
    size: '',
    borderColor: 'border-rank-gold',
    textColor: 'text-rank-gold-text',
    nameSize: 'text-2xl',
    scoreSize: 'text-2xl',
    podiumHeight: 'h-28 sm:h-32',
    podiumWidth: 'w-20 sm:w-28',
    podiumBg: 'bg-yellow-100',
    podiumBorder: 'border-yellow-200',
    badge: {
      bg: 'bg-rank-gold',
      text: '#1',
    },
    showTrophy: true,
    showRankNumber: true,
  },
  second: {
    order: 'order-2 sm:order-1',
    size: '',
    borderColor: 'border-rank-silver',
    textColor: 'text-rank-silver-text',
    nameSize: 'text-lg',
    scoreSize: 'text-lg',
    podiumHeight: 'h-20 sm:h-24',
    podiumWidth: 'w-16 sm:w-20',
    podiumBg: 'bg-gray-100',
    podiumBorder: 'border-gray-200',
    badge: {
      bg: 'bg-rank-silver',
      text: '#2',
    },
    showTrophy: false,
    showRankNumber: false,
  },
  third: {
    order: 'order-3',
    size: '',
    borderColor: 'border-rank-bronze',
    textColor: 'text-rank-bronze-text',
    nameSize: 'text-lg',
    scoreSize: 'text-lg',
    podiumHeight: 'h-14 sm:h-16',
    podiumWidth: 'w-16 sm:w-20',
    podiumBg: 'bg-orange-100',
    podiumBorder: 'border-orange-200',
    badge: {
      bg: 'bg-rank-bronze',
      text: '#3',
    },
    showTrophy: false,
    showRankNumber: false,
  },
};

const PodiumPlayer = ({ player, position }: PodiumPlayerProps) => {
  const config = PODIUM_CONFIG[position];

  return (
    <div className={`${config.order} flex flex-col items-center`}>
      <div className="group relative">
        <div
          className={`${config.size} relative mb-3 flex items-center justify-center overflow-hidden rounded-full border-4 ${config.borderColor} bg-white shadow-${position === 'first' ? 'xl' : 'lg'}`}
        >
          <UserAvatar
            name={player.profileId}
            className={position === 'first' ? 'h-20 w-20' : 'h-16 w-16'}
          />
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
      </h3>

      <p className={`${config.textColor} ${config.scoreSize} font-bold`}>
        {player.score.toLocaleString()} 점
      </p>

      <div
        className={`${config.podiumHeight} ${config.podiumWidth} ${config.podiumBg} mt-2 rounded-t-lg border-x-2 border-t-2 ${config.podiumBorder} ${position === 'first' ? 'flex items-end justify-center pb-2' : ''}`}
      ></div>
    </div>
  );
};
export default PodiumPlayer;
