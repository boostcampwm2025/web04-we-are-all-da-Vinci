import { PATHS } from '@/shared/config';
import { CommonBtn } from '@/shared/ui';

interface WaitingRoomActionsProps {
  onStartClick: () => void;
  onSettingsClick?: () => void;
  isHost: boolean;
  canStart: boolean;
}

export const WaitingRoomActions = ({
  onStartClick,
  onSettingsClick,
  isHost,
  canStart,
}: WaitingRoomActionsProps) => {
  return (
    <div className="flex gap-2 md:gap-4">
      {isHost && onSettingsClick && (
        <div className="flex-none md:hidden">
          <CommonBtn
            variant="radius"
            size="md"
            icon="settings"
            text=""
            color="gray"
            onClick={onSettingsClick}
            className="w-12"
          />
        </div>
      )}
      <div className="flex-1">
        <CommonBtn
          variant="radius"
          size="md"
          icon="logout"
          text="나가기"
          path={PATHS.HOME}
          color="red"
          className="text-lg md:text-xl"
        />
      </div>
      <div className="flex-1">
        <CommonBtn
          variant="radius"
          size="md"
          icon="play_arrow"
          text="시작"
          color="blue"
          onClick={onStartClick}
          disabled={!isHost || !canStart}
          className="text-lg md:text-xl"
        />
      </div>
    </div>
  );
};
