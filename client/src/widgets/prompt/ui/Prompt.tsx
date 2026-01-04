import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/shared/config';
import { Timer } from '@/shared/ui';
import { RoundBadge } from '@/shared/ui/round';
import { GameStartHeader, ImagePreviewCard } from '@/entities/gameStart';

export const Prompt = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      navigate(PATHS.DRAWING_GAME);
    }
  }, [countdown, navigate]);

  return (
    <>
      <div className="absolute top-8 right-8 z-20">
        <div className="relative inline-block">
          <Timer time={5} />
        </div>
      </div>

      <div className="flex h-full w-full items-center justify-center px-4 py-4">
        <div className="flex h-full w-full max-w-3xl flex-col">
          <GameStartHeader
            roundBadge={<RoundBadge round={1} />}
            title="기억하세요!"
          />

          <div className="flex min-h-0 flex-1 items-center justify-center">
            <ImagePreviewCard />
          </div>
        </div>
      </div>
    </>
  );
};
