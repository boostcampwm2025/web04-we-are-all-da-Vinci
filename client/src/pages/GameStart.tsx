import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/constants/paths';
import house from '@/assets/images/house.png';

export default function GameStart() {
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
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-red-500 bg-white shadow-xl">
            <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400">
              <span className="material-symbols-outlined text-lg text-yellow-900">
                schedule
              </span>
            </div>
            <span className="font-handwriting animate-pulse text-6xl font-black text-red-500">
              {countdown}
            </span>
          </div>
        </div>
      </div>

      <div className="flex h-full w-full items-center justify-center px-4 py-4">
        <div className="flex h-full w-full max-w-3xl flex-col">
          <div className="mb-4 shrink-0 text-center">
            <div className="mb-2 inline-block rounded-full bg-indigo-600 px-4 py-1 text-sm font-bold text-white">
              ROUND 1
            </div>
            <h1 className="font-handwriting mb-1 text-3xl font-black md:text-4xl">
              기억하세요!
            </h1>
            <p className="font-handwriting text-base text-gray-600">
              곧 그림이 보여집니다
            </p>
            <div className="mx-auto mt-1 h-1.5 w-40 rounded-full bg-yellow-300" />
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="relative w-full max-w-2xl rounded-2xl border-4 border-gray-800 bg-white p-3 shadow-2xl">
              <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-lg">
                <img
                  src={house}
                  alt="Drawing Prompt"
                  className="absolute h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
