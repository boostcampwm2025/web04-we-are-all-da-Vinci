import { CommonBtn } from '@/shared/ui';
import type { FinalResult } from '../model/types';
import PodiumPlayer from './PodiumPlayer';

interface FinalRankingCardProps {
  topThree: FinalResult[];
  timer: number;
  isHost: boolean;
  isButtonEnabled: boolean;
  onRestart: () => void;
}

const FinalRankingCard = ({
  topThree,
  timer,
  isHost,
  isButtonEnabled,
  onRestart,
}: FinalRankingCardProps) => {
  return (
    <div className="card flex h-full w-full flex-col p-6">
      <div className="mb-6 text-center">
        <h2 className="text-title text-2xl text-gray-800">최종 순위</h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8">
        <div className="flex w-full items-end justify-center px-2">
          {topThree[1] && (
            <PodiumPlayer player={topThree[1]} position="second" />
          )}
          {topThree[0] && (
            <PodiumPlayer player={topThree[0]} position="first" />
          )}
          {topThree[2] && (
            <PodiumPlayer player={topThree[2]} position="third" />
          )}
        </div>

        <div className="flex w-full flex-col items-center gap-3">
          {isHost && (
            <div className="w-full">
              <CommonBtn
                variant="radius"
                icon="replay"
                text="다시하기"
                onClick={onRestart}
                disabled={!isButtonEnabled}
                className="w-full justify-center py-3 text-lg"
              />
            </div>
          )}

          <p className="text-content-disabled text-sm">
            {timer}초 후 대기실로 이동
          </p>
        </div>
      </div>
    </div>
  );
};
export default FinalRankingCard;
