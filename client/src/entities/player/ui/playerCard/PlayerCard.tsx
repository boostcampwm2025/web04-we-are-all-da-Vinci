import { useIsCurrentUser, useIsHost } from '@/entities/gameRoom/model';
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
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 p-6 text-center ${
        isCurrentUser
          ? 'border-interactive-light bg-interactive-subtle'
          : 'border-stroke-default bg-surface-subtle'
      }`}
    >
      <UserAvatar name={profileId} size={56} />
      <div className="font-handwriting mt-2 mb-1 text-lg font-bold">
        {nickname}
      </div>
      {isHost && <span className="absolute top-2 right-2 text-xl">👑</span>}
      {!isHost && isCurrentUserHost && (
        <span
          className="material-symbols-outlined absolute top-2 right-2 cursor-pointer text-xl hover:text-red-500"
          onClick={(e) => {
            e.stopPropagation();
            onKickClick?.();
          }}
        >
          close
        </span>
      )}

      {status && (
        <div className="font-handwriting text-md text-content-tertiary">
          {status}
        </div>
      )}
    </div>
  );
};

export default PlayerCard;
