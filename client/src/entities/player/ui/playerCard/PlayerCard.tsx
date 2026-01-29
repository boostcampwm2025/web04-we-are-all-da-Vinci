import { useIsCurrentUser, useIsHost } from '@/entities/gameRoom';
import { UserAvatar } from '@/shared/ui';

interface PlayerCardProps {
  id: string;
  nickname: string;
  profileId: string;
  isHost: boolean;
  status?: string;
  onKickClick?: () => void;
}

const PlayerCard = ({
  id,
  isHost,
  nickname,
  status,
  onKickClick,
  profileId,
}: PlayerCardProps) => {
  const isCurrentUser = useIsCurrentUser(id);
  const isCurrentUserHost = useIsHost();
  return (
    <div
      key={id}
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 p-2 text-center transition-all sm:p-4 lg:p-6 ${
        isCurrentUser
          ? 'border-interactive-light bg-interactive-subtle'
          : 'border-stroke-default bg-surface-subtle'
      }`}
    >
      <UserAvatar name={profileId} size={60} />

      <div className="font-handwriting mt-2 mb-1 w-full truncate px-1 text-sm font-bold sm:text-base lg:text-lg">
        {nickname}
      </div>
      {isHost && (
        <span className="absolute top-2 right-2 text-sm sm:text-lg lg:text-xl">
          👑
        </span>
      )}
      {!isHost && isCurrentUserHost && (
        <span
          className="material-symbols-outlined absolute top-1 right-1 cursor-pointer text-base hover:text-red-500 sm:top-2 sm:right-2 sm:text-lg lg:text-xl"
          onClick={(e) => {
            e.stopPropagation();
            onKickClick?.();
          }}
        >
          close
        </span>
      )}

      {status && (
        <div className="font-handwriting lg:text-md text-content-tertiary text-xs sm:text-sm">
          {status}
        </div>
      )}
    </div>
  );
};

export default PlayerCard;
