import { PATHS } from '@/shared/config';
import { CommonBtn } from '@/shared/ui';

interface WaitingRoomActionsProps {
  onSettingsClick: () => void;
}

export const WaitingRoomActions = ({
  onSettingsClick,
}: WaitingRoomActionsProps) {
  return (
    <>
      <CommonBtn
        variant="radius"
        icon="play_arrow"
        text="게임 시작"
        color="blue"
        path={PATHS.GAME_START}
      />

      <div className="grid grid-cols-2 gap-4">
        <CommonBtn
          variant="radius"
          icon="settings"
          text="설정 변경"
          color="gray"
          onClick={onSettingsClick}
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
}
