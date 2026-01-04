import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/shared/config';
import { RankingCard } from '@/entities/ranking';

export default function DrawingGame() {
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
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-red-500 bg-white shadow-xl">
            <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400">
              <span className="material-symbols-outlined text-sm text-yellow-900">
                schedule
              </span>
            </div>
            <span className="font-handwriting text-4xl font-black text-red-500">
              {timeLeft}
            </span>
          </div>
          <div className="mt-1 text-center">
            <span className="font-handwriting text-xs text-gray-600">초</span>
          </div>
        </div>
      </div>

      <div className="flex h-full w-full items-center justify-center px-4 py-4">
        <div className="flex h-full w-full max-w-7xl flex-col">
          <div className="mb-4 shrink-0 text-center">
            <h1 className="font-handwriting mb-2 text-3xl font-black">
              그림을 그려주세요!
            </h1>
            <div className="mx-auto h-1.5 w-48 rounded-full bg-yellow-300" />
          </div>

          <div className="flex min-h-0 flex-1 gap-4">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border-4 border-gray-800 bg-white shadow-2xl">
                <div className="flex shrink-0 items-center gap-4 border-b-2 border-gray-300 bg-gray-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="h-8 w-8 rounded-full border-2 border-gray-400 bg-black transition-transform hover:scale-110"></button>
                    <button className="h-8 w-8 rounded-full border-2 border-gray-300 bg-red-500 transition-transform hover:scale-110"></button>
                    <button className="h-8 w-8 rounded-full border-2 border-gray-300 bg-blue-500 transition-transform hover:scale-110"></button>
                    <button className="h-8 w-8 rounded-full border-2 border-gray-300 bg-green-500 transition-transform hover:scale-110"></button>
                    <button className="h-8 w-8 rounded-full border-2 border-gray-300 bg-yellow-400 transition-transform hover:scale-110"></button>
                  </div>

                  <div className="h-6 w-px bg-gray-400"></div>

                  <div className="flex items-center gap-2">
                    <button className="rounded-lg p-2 transition-colors hover:bg-gray-200">
                      <span className="material-symbols-outlined text-gray-700">
                        edit
                      </span>
                    </button>
                    <button className="rounded-lg p-2 transition-colors hover:bg-gray-200">
                      <span className="material-symbols-outlined text-gray-700">
                        ink_eraser
                      </span>
                    </button>
                  </div>

                  <div className="h-6 w-px bg-gray-400"></div>

                  <button className="flex items-center gap-1 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100">
                    <span className="material-symbols-outlined">delete</span>
                    <span className="font-handwriting text-sm font-bold">
                      지우기
                    </span>
                  </button>
                </div>

                <div className="relative min-h-0 flex-1 bg-white">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-6 py-2 text-white shadow-lg">
                    <span className="font-handwriting text-lg font-bold">
                      주제: 웃는 얼굴
                    </span>
                  </div>

                  <div className="flex h-full w-full items-center justify-center">
                    <p className="font-handwriting text-xl text-gray-400">
                      여기에 그림을 그리세요
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-72 flex-col">
              <div className="flex h-full flex-col rounded-2xl border-2 border-gray-800 bg-white p-4 shadow-lg">
                <div className="mb-3 flex shrink-0 items-center justify-between">
                  <h3 className="font-handwriting text-lg font-bold">
                    실시간 랭킹
                  </h3>
                  <span className="material-symbols-outlined text-sm text-blue-600">
                    sync
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-center space-y-3">
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
