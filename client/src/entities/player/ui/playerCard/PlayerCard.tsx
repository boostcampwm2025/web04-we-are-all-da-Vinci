import { useIsCurrentUser } from '@/entities/gameRoom/model';
import { UserAvatar } from '@/shared/ui';

interface PlayerCardProps {
  id: string;
  nickname: string;
  profileId: string;
  isHost: boolean;
  status?: string;
}

const PlayerCard = ({
  id,
  isHost,
  nickname,
  profileId,
  status,
}: PlayerCardProps) => {
  const isCurrentUser = useIsCurrentUser(id);
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
      <div className="font-handwriting mb-1 mt-2 text-lg font-bold">
        {nickname}
      </div>
      {isHost && <span className="absolute top-2 right-2 text-xl">👑</span>}
      {status && (
        <div className="font-handwriting text-md text-content-tertiary">
          {status}
        </div>
      )}
    </div>
  );
};

export default PlayerCard;
