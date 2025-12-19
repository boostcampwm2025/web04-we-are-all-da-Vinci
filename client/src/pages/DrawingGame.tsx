import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/constants/paths';
import { Canvas } from '@/features/canvasDraw/ui/Canvas';
import { calculateSimilarityVector } from '@/shared/lib/similarity/calculateSimilarityVector';
import { useSocket } from '@/contexts/SocketContext';
import type { Stroke } from '@/entities/drawing/model/types';

// 랭킹 색상 테마
const RANKING_COLORS = [
  {
    border: 'border-yellow-400',
    bg: 'bg-yellow-50',
    icon: 'bg-yellow-500',
    text: 'text-yellow-600',
    progressBg: 'bg-yellow-200',
    progressFill: 'bg-yellow-500',
  },
  {
    border: 'border-gray-400',
    bg: 'bg-gray-50',
    icon: 'bg-gray-400',
    text: 'text-gray-600',
    progressBg: 'bg-gray-200',
    progressFill: 'bg-gray-400',
  },
  {
    border: 'border-orange-400',
    bg: 'bg-orange-50',
    icon: 'bg-orange-500',
    text: 'text-orange-600',
    progressBg: 'bg-orange-200',
    progressFill: 'bg-orange-500',
  },
  {
    border: 'border-purple-400',
    bg: 'bg-purple-50',
    icon: 'bg-purple-500',
    text: 'text-purple-600',
    progressBg: 'bg-purple-200',
    progressFill: 'bg-purple-500',
  },
  {
    border: 'border-pink-400',
    bg: 'bg-pink-50',
    icon: 'bg-pink-500',
    text: 'text-pink-600',
    progressBg: 'bg-pink-200',
    progressFill: 'bg-pink-500',
  },
];

const MY_COLOR = {
  border: 'border-blue-400',
  bg: 'bg-blue-50',
  icon: 'bg-blue-500',
  text: 'text-blue-600',
  progressBg: 'bg-blue-200',
  progressFill: 'bg-blue-600',
};

// 등급 계산 함수
const getGrade = (score: number): string => {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
};

export default function DrawingGame() {
  const navigate = useNavigate();
  const { players, updateScore, submitDrawing, currentUser } = useSocket();
  const [timeLeft, setTimeLeft] = useState(30);
  const [similarity, setSimilarity] = useState(0);
  const [grade, setGrade] = useState('D');
  const currentStrokesRef = useRef<Stroke[]>([]);

  // 플레이어 정렬 (점수 높은 순)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // 타이머 useEffect
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // 타이머 종료 시 그림 제출
      const strokes = currentStrokesRef.current;
      if (strokes.length > 0) {
        // Stroke 형식을 서버 형식으로 변환
        // const formattedStrokes = strokes.map((stroke) => [
        //   stroke[0], // x 좌표 배열
        //   stroke[1], // y 좌표 배열
        // ]);
        submitDrawing(similarity, strokes);
      }
      navigate(PATHS.FINAL_RESULTS);
    }
  }, [timeLeft, navigate, similarity, submitDrawing]);

  // Canvas에서 strokes가 업데이트될 때 호출 (마우스를 뗄 때마다)
  const handleStrokesChange = (strokes: Stroke[]) => {
    currentStrokesRef.current = strokes; // strokes 저장
    if (strokes.length > 0) {
      const result = calculateSimilarityVector(strokes);
      setSimilarity(result.similarity);
      setGrade(result.grade);
      // 서버로 유사도 전송
      updateScore(result.similarity);
    } else {
      setSimilarity(0);
      setGrade('D');
      updateScore(0);
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
                  {/* 유사도 표시 */}
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

            {/* 실시간 랭킹 패널 */}
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

                <div className="flex flex-1 flex-col justify-start space-y-3 overflow-y-auto">
                  {sortedPlayers.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
                      <span className="material-symbols-outlined mb-2 text-4xl">
                        hourglass_empty
                      </span>
                      <p className="font-handwriting text-center text-sm">
                        그림을 그리면
                        <br />
                        랭킹이 표시됩니다
                      </p>
                    </div>
                  ) : (
                    sortedPlayers.map((player, index) => {
                      const isMe = player.userId === currentUser?.nickname;
                      const color = isMe
                        ? MY_COLOR
                        : RANKING_COLORS[index % RANKING_COLORS.length];
                      const playerGrade = getGrade(player.score);

                      return (
                        <div
                          key={player.userId}
                          className={`rounded-xl border-2 p-3 ${color.border} ${color.bg} ${isMe ? 'ring-2 ring-blue-300' : ''}`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex h-6 w-6 items-center justify-center rounded-full ${color.icon} text-xs font-bold text-white`}
                              >
                                {index + 1}
                              </div>
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full ${color.icon}`}
                              >
                                <span className="material-symbols-outlined text-sm text-white">
                                  account_circle
                                </span>
                              </div>
                              <span className="font-handwriting text-sm font-bold">
                                {isMe ? `${player.userId} (나)` : player.userId}
                                <span className="ml-1 text-xs">
                                  ({playerGrade})
                                </span>
                              </span>
                            </div>
                            <span className={`text-lg font-bold ${color.text}`}>
                              {player.score.toFixed(1)}%
                            </span>
                          </div>
                          <div
                            className={`h-2 w-full rounded-full ${color.progressBg}`}
                          >
                            <div
                              className={`h-2 rounded-full ${color.progressFill} transition-all duration-300`}
                              style={{
                                width: `${Math.min(player.score, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
