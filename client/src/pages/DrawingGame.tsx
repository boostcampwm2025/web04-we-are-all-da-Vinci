import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/constants/paths';
import { Canvas } from '@/features/canvasDraw/ui/Canvas';
import { calculateSimilarityVector } from '@/shared/lib/similarity/calculateSimilarityVector';
import type { Stroke } from '@/entities/drawing/model/types';

export default function DrawingGame() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(30000000000000000);
  const [similarity, setSimilarity] = useState(0);
  const [grade, setGrade] = useState('F');

  // 타이머 useEffect
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

  // Canvas에서 strokes가 업데이트될 때 호출 (마우스를 뗄 때마다)
  const handleStrokesChange = (strokes: Stroke[]) => {
    if (strokes.length > 0) {
      const result = calculateSimilarityVector(strokes);
      setSimilarity(result.similarity);
      setGrade(result.grade);
      console.log('[유사도 계산]', {
        similarity: result.similarity,
        grade: result.grade,
        strokeCount: strokes.length,
      });
    } else {
      // Canvas에서 clear되면 빈 배열이 전달됨
      setSimilarity(0);
      setGrade('F');
    }
  };

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
                <div className="relative min-h-0 flex-1 bg-white">
                  {/* 임시 유사도 표시 */}
                  <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-black/80 px-6 py-3 text-white shadow-lg">
                    <div className="text-center">
                      <div className="mb-1 text-sm font-medium">
                        현재 유사도
                      </div>
                      <div className="text-3xl font-bold text-yellow-300">
                        {similarity.toFixed(1)}%
                      </div>
                      <div className="mt-1 text-lg font-bold">
                        등급: {grade}
                      </div>
                    </div>
                  </div>

                  <div className="flex h-full w-full items-center justify-center">
                    <Canvas onStrokesChange={handleStrokesChange} />
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
                  <div className="rounded-xl border-2 border-blue-400 bg-blue-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
                          <span className="material-symbols-outlined text-sm text-white">
                            account_circle
                          </span>
                        </div>
                        <span className="font-handwriting text-sm font-bold">
                          나 ({grade})
                        </span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        {similarity.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-blue-200">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${Math.min(similarity, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500">
                          <span className="material-symbols-outlined text-sm text-white">
                            account_circle
                          </span>
                        </div>
                        <span className="font-handwriting text-sm font-bold">
                          Player 2
                        </span>
                      </div>
                      <span className="text-lg font-bold text-yellow-600">
                        45%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-yellow-200">
                      <div
                        className="h-2 rounded-full bg-yellow-600"
                        style={{ width: '45%' }}
                      ></div>
                    </div>
                  </div>

                  <div className="rounded-xl border-2 border-pink-400 bg-pink-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500">
                          <span className="material-symbols-outlined text-sm text-white">
                            account_circle
                          </span>
                        </div>
                        <span className="font-handwriting text-sm font-bold">
                          Player 3
                        </span>
                      </div>
                      <span className="text-lg font-bold text-pink-600">
                        12%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-pink-200">
                      <div
                        className="h-2 rounded-full bg-pink-600"
                        style={{ width: '12%' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
