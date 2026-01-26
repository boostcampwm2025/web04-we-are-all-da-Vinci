import { useGameStore } from '@/entities/gameRoom/model';
import { CommonBtn } from '@/shared/ui';
import { SERVER_EVENTS } from '@/shared/config';
import { getSocket } from '@/shared/api';

export const WaitingRoomOverlay = () => {
  const socket = getSocket();
  const { currentRound, totalRounds } = useGameStore(
    (state) => state.gameProgress,
  );

  const handlePracticeStart = () => {
    socket.emit(SERVER_EVENTS.USER_PRACTICE);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl bg-gray-300 opacity-60">
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-3xl font-bold">게임 진행 중</h2>
        <p className="text-content-secondary text-xl">
          현재 {currentRound} / {totalRounds} 라운드가 진행되고 있습니다.
        </p>
        <p className="text-content-disabled mt-2 text-sm">
          다음 라운드 또는 결과 화면부터 자동으로 참여됩니다.
        </p>
      </div>

      <div className="flex gap-4">
        <CommonBtn
          variant="radius"
          text="연습하기"
          color="blue"
          onClick={handlePracticeStart}
        />
      </div>
    </div>
  );
};
