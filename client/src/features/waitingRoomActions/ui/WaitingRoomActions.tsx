import { PATHS } from '@/shared/config';
import { CommonBtn } from '@/shared/ui';

interface WaitingRoomActionsProps {
  onSettingsClick: () => void;
  onStartClick: () => void;
  isHost: boolean;
  canStart: boolean;
}

export const WaitingRoomActions = ({
  onSettingsClick,
  onStartClick,
  isHost,
  canStart,
}: WaitingRoomActionsProps) => {
  return (
    <>
      <CommonBtn
        variant="radius"
        icon="play_arrow"
        text="게임 시작"
        color="blue"
        onClick={onStartClick}
        disabled={!isHost || !canStart}
      />

      <div className="grid grid-cols-2 gap-4">
        <CommonBtn
          variant="radius"
          icon="settings"
          text="설정 변경"
          color="gray"
          onClick={onSettingsClick}
          disabled={!isHost}
        />
        <CommonBtn
          variant="radius"
          icon="logout"
          text="나가기"
          path={PATHS.HOME}
          color="red"
        />
      </div>
    </>
  );
};
