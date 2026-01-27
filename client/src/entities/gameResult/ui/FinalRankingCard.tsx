import { CommonBtn, FireworkCanvas } from '@/shared/ui';
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
    <div className="card relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-6">
      <FireworkCanvas className="z-50" />
      <div className="relative z-10 mb-4 text-center">
        <h2 className="text-title text-3xl text-gray-800">최종 순위</h2>
      </div>

      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-8">
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
            <CommonBtn
              variant="scribble"
              icon="replay"
              text="다시하기"
              onClick={onRestart}
              disabled={!isButtonEnabled}
            />
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
