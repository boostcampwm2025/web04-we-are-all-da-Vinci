import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/shared/config';
import { RankingCard } from '@/entities/ranking';
import {
  DrawingTimer,
  DrawingHeader,
  DrawingTopic,
  RankingPanel,
} from '@/entities/drawing';
import { DrawingToolbar } from '@/features/drawingToolbar';
import { DrawingCanvas } from '@/features/drawingCanvas';
import { RoundBadge } from '@/shared/ui/round';
import { Timer } from '@/shared/ui';

export const Drawing = () => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      navigate(PATHS.FINAL_RESULTS);
    }
  }, [timeLeft, navigate]);

  return (
    <>
      <div className="absolute top-8 right-8 z-20">
        <div className="relative inline-block">
          <Timer time={5} />
        </div>
      </div>
      <div className="flex h-screen w-full items-center justify-center px-4 py-4">
        <div className="flex h-full w-full max-w-7xl flex-col">
          <DrawingHeader
            title="그림을 그려주세요!"
            roundBadge={<RoundBadge round={1} />}
          />

          <div className="flex min-h-0 flex-1 gap-4">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border-4 border-gray-800 bg-white shadow-2xl">
                <DrawingToolbar />
                <DrawingCanvas topic={<DrawingTopic topic="웃는 얼굴" />} />
              </div>
            </div>

            <RankingPanel>
              <RankingCard
                rank={1}
                icon="account_circle"
                nickname="User 1"
                percent={82}
                color="blue"
              />
              <RankingCard
                rank={2}
                icon="account_circle"
                nickname="Player 2"
                percent={45}
                color="yellow"
              />
              <RankingCard
                rank={3}
                icon="account_circle"
                nickname="Player 3"
                percent={12}
                color="purple"
              />
            </RankingPanel>
          </div>
        </div>
      </div>
    </>
  );
};
