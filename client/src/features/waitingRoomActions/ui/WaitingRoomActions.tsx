import { PATHS } from '@/shared/config';
import { CommonBtn } from '@/shared/ui';

interface WaitingRoomActionsProps {
  onStartClick: () => void;
  isHost: boolean;
  canStart: boolean;
}

export const WaitingRoomActions = ({
  onStartClick,
  isHost,
  canStart,
}: WaitingRoomActionsProps) => {
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <CommonBtn
          variant="radius"
          icon="logout"
          text="나가기"
          path={PATHS.HOME}
          color="red"
        />
      </div>
      <div className="flex-1">
        <CommonBtn
          variant="radius"
          icon="play_arrow"
          text="게임 시작"
          color="blue"
          onClick={onStartClick}
          disabled={!isHost || !canStart}
        />
      </div>
      
    </div>
  );
};
