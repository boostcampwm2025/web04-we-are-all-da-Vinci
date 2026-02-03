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

export const PlayerCard = ({
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
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 p-2 text-center transition-all xl:p-6 ${
        isCurrentUser
          ? 'border-interactive-light bg-interactive-subtle'
          : 'border-stroke-default bg-surface-subtle'
      }`}
    >
      <UserAvatar
        name={profileId}
        className="h-8 w-8 md:h-12 md:w-12 xl:h-16 xl:w-16"
      />

      <div className="font-handwriting mt-1 mb-0 w-full truncate px-1 text-[10px] leading-tight font-bold sm:text-base lg:text-lg xl:mt-2 xl:mb-1">
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
