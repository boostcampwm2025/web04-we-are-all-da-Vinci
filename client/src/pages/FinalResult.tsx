import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import DrawingReplay from '@/features/drawingReplay/ui/DrawingReplay';
import type { Stroke } from '@/entities/drawing/model/types';
import house from '@/assets/images/house.png';

// 순위별 이모지
const getRankEmoji = (rank: number): string => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
};

// 순위별 색상 테마
const getRankColors = (rank: number) => {
  if (rank === 1)
    return {
      border: 'border-yellow-400',
      bg: 'bg-yellow-50',
      badge: 'bg-yellow-400 text-yellow-900',
      text: 'text-yellow-600',
      progressBg: 'bg-yellow-200',
      progressFill: 'bg-yellow-600',
    };
  if (rank === 2)
    return {
      border: 'border-gray-400',
      bg: 'bg-gray-50',
      badge: 'bg-gray-400 text-gray-900',
      text: 'text-gray-600',
      progressBg: 'bg-gray-200',
      progressFill: 'bg-gray-600',
    };
  if (rank === 3)
    return {
      border: 'border-orange-400',
      bg: 'bg-orange-50',
      badge: 'bg-orange-400 text-orange-900',
      text: 'text-orange-600',
      progressBg: 'bg-orange-200',
      progressFill: 'bg-orange-600',
    };
  return {
    border: 'border-gray-300',
    bg: 'bg-gray-50',
    badge: 'bg-gray-300 text-gray-700',
    text: 'text-gray-500',
    progressBg: 'bg-gray-200',
    progressFill: 'bg-gray-500',
  };
};

export default function FinalResults() {
  const { players, currentUser, roundResults } = useSocket();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // 플레이어 정렬 및 순위 부여
  const rankings = [...players]
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      rank: index + 1,
      name: player.userId,
      score: player.score,
      isMe: player.userId === currentUser?.nickname,
    }));

  // 1위 플레이어 자동 선택
  useEffect(() => {
    if (rankings.length > 0 && !selectedPlayer) {
      setSelectedPlayer(rankings[0].name);
    }
  }, [rankings, selectedPlayer]);

  // 선택된 플레이어의 그림 데이터 찾기
  const selectedResult = roundResults?.find((r) => r.userId === selectedPlayer);
  const selectedRanking = rankings.find((r) => r.name === selectedPlayer);

  return (
    <>
      <div className="flex h-full w-full items-center justify-center px-4 py-4">
        <div className="flex h-full w-full max-w-5xl flex-col">
          <div className="mb-4 shrink-0 text-center">
            <h1 className="font-handwriting mb-2 text-3xl font-black">
              라운드 결과
            </h1>
            <div className="mx-auto h-1.5 w-48 rounded-full bg-yellow-300" />
          </div>

          <div className="flex min-h-0 flex-1 gap-4">
            {/* 원본 이미지 영역 */}
            <div className="flex flex-1 flex-col">
              <div className="flex h-full flex-col rounded-xl border-2 border-gray-800 bg-white p-3 shadow-lg">
                <div className="mb-2 flex shrink-0 items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base text-blue-600">
                      category
                    </span>
                    <h3 className="font-handwriting text-sm font-bold">
                      원본 그림
                    </h3>
                  </div>
                  <div className="rounded-full bg-green-300 px-2 py-0.5 text-xs font-bold text-green-900">
                    정답
                  </div>
                </div>
                <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                  <img
                    src={house}
                    alt="원본"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 선택된 플레이어 그림 영역 */}
            <div className="flex flex-1 flex-col">
              <div className="flex h-full flex-col rounded-xl border-2 border-gray-800 bg-white p-3 shadow-lg">
                <div className="mb-2 flex shrink-0 items-center justify-between">
                  <h3 className="font-handwriting text-sm font-bold">
                    {selectedPlayer ? `${selectedPlayer}의 그림` : '그림 선택'}
                  </h3>
                  {selectedRanking && (
                    <div className="rounded-full bg-blue-300 px-2 py-0.5 text-xs font-bold text-blue-900">
                      {selectedRanking.rank}위{' '}
                      {getRankEmoji(selectedRanking.rank)}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                  {selectedResult?.drawing ? (
                    <DrawingReplay
                      strokes={selectedResult.drawing as Stroke[]}
                      width={280}
                      height={280}
                      originalWidth={500}
                      originalHeight={500}
                      replaySpeed={2}
                      loop={true}
                    />
                  ) : (
                    <span className="font-handwriting text-gray-400">
                      플레이어를 선택하세요
                    </span>
                  )}
                </div>
                <div className="mt-2 shrink-0">
                  <div className="text-center">
                    <span className="font-handwriting text-sm font-bold text-blue-600">
                      유사도: {selectedRanking?.score.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${selectedRanking?.score || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 순위 목록 */}
            <div className="flex w-72 flex-col gap-3">
              <div className="shrink-0 rounded-xl border-2 border-pink-400 bg-pink-50 p-3 shadow-lg">
                <div className="text-center">
                  <div className="mb-1 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-lg text-pink-600">
                      celebration
                    </span>
                    <h3 className="font-handwriting text-base font-bold">
                      게임 종료
                    </h3>
                  </div>
                  <p className="font-handwriting mt-1 text-xs text-gray-600">
                    {rankings.length}명 참가
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto rounded-xl border-2 border-gray-800 bg-white p-3 shadow-lg">
                <div className="mb-3 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-base text-yellow-600">
                    emoji_events
                  </span>
                  <h3 className="font-handwriting text-base font-bold">
                    최종 순위
                  </h3>
                  <span className="material-symbols-outlined text-base text-yellow-600">
                    emoji_events
                  </span>
                </div>

                <div className="space-y-2">
                  {rankings.length === 0 ? (
                    <div className="text-center text-gray-400">
                      <p className="font-handwriting text-sm">결과 없음</p>
                    </div>
                  ) : (
                    rankings.map((player) => {
                      const colors = getRankColors(player.rank);
                      const emoji = getRankEmoji(player.rank);
                      const isSelected = player.name === selectedPlayer;

                      return (
                        <button
                          key={player.name}
                          onClick={() => setSelectedPlayer(player.name)}
                          className={`w-full rounded-lg border-2 p-2 text-left transition-all ${colors.border} ${colors.bg} ${
                            isSelected
                              ? 'scale-[1.02] ring-2 ring-blue-500'
                              : 'hover:scale-[1.01]'
                          } ${player.isMe ? 'ring-2 ring-blue-300' : ''}`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${colors.badge}`}
                              >
                                {player.rank}
                              </div>
                              <span className="font-handwriting text-xs font-bold">
                                {player.isMe
                                  ? `${player.name} (나)`
                                  : player.name}
                              </span>
                              {emoji && (
                                <span className="text-sm">{emoji}</span>
                              )}
                            </div>
                            <span
                              className={`text-sm font-bold ${colors.text}`}
                            >
                              {player.score.toFixed(1)}%
                            </span>
                          </div>
                          <div
                            className={`h-1.5 w-full rounded-full ${colors.progressBg}`}
                          >
                            <div
                              className={`h-1.5 rounded-full ${colors.progressFill}`}
                              style={{ width: `${player.score}%` }}
                            />
                          </div>
                        </button>
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
