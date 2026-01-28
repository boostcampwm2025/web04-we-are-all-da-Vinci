import { StaticCanvas } from '@/entities/drawing';
import { PodiumPlayer } from '@/entities/gameResult';
import { useGameStore, useIsHost } from '@/entities/gameRoom/model';
import { PlayerSimilarityDetailTooltip } from '@/entities/similarity';
import { TIMER } from '@/entities/timer/config';
import { DrawingReplayCanvas } from '@/features/replayingCanvas';
import { getSocket } from '@/shared/api';
import { SERVER_EVENTS, TITLES } from '@/shared/config';
import { CommonBtn, GameHeader } from '@/shared/ui';
import { useState } from 'react';

const BUTTON_ENABLE_AFTER = 10; // 10초 후 버튼 활성화

export const GameEnd = () => {
  const finalResults = useGameStore((state) => state.finalResults);
  const settings = useGameStore((state) => state.settings);
  const highlight = useGameStore((state) => state.highlight);
  const roomId = useGameStore((state) => state.roomId);
  const timer = useGameStore((state) => state.timer);
  const isHost = useIsHost();

  const topThree = finalResults.slice(0, 3);
  const isButtonEnabled = timer <= TIMER.GAME_END_TIME - BUTTON_ENABLE_AFTER;

  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleRestart = () => {
    if (!isButtonEnabled) return;

    // 서버에 ROOM_RESTART 이벤트 전송하여 방 상태를 WAITING으로 변경
    const socket = getSocket();
    socket.emit(SERVER_EVENTS.ROOM_RESTART, { roomId });
  };

  return (
    <div className="page-center">
      <main className="game-container">
        {/* 타이틀 */}
        <GameHeader title={TITLES.END} showDecoration />

        {/* 컨텐츠 영역 */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-8 md:justify-center lg:flex-row lg:items-center lg:gap-16">
          {/* 왼쪽: POTG 카드 */}
          <div className="flex w-full justify-center lg:w-3/5 lg:justify-end">
            <div className="card-lg flex w-full max-w-3xl flex-col">
              <div className="border-stroke-default mb-4 flex items-center justify-between border-b border-dashed pb-2">
                <div className="font-handwriting text-content-primary text-2xl">
                  <span className="material-symbols-outlined text-rank-gold mr-1 align-middle">
                    leaderboard
                  </span>
                  1등 POTG!!
                </div>
                <span className="text-content-tertiary text-sm">
                  총 라운드: {settings.totalRounds}
                </span>
              </div>

              {highlight ? (
                <div className="flex flex-col items-center gap-6">
                  <div
                    className="relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <p className="font-handwriting text-content-secondary cursor-pointer text-3xl underline">
                      유사도: {highlight.similarity.similarity.toFixed(2)}%
                    </p>
                    {/* Similarity Detail Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-5 left-full z-20 mr-2 w-48">
                        <PlayerSimilarityDetailTooltip
                          similarity={highlight.similarity}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex w-full flex-col gap-6 md:flex-row">
                    {/* 제시 이미지 */}
                    <div className="flex-1">
                      <p className="text-content-tertiary mb-2 text-center text-sm">
                        제시 이미지
                      </p>
                      <div className="border-stroke-muted bg-surface-base aspect-square w-full overflow-hidden rounded-xl border-2">
                        <StaticCanvas
                          strokes={highlight.promptStrokes}
                          className="h-full w-full"
                        />
                      </div>
                    </div>
                    {/* 1등 그림 */}
                    <div className="flex-1">
                      <p className="text-content-tertiary mb-2 text-center text-sm">
                        1등 그림
                      </p>
                      <div className="border-rank-gold bg-surface-base aspect-square w-full overflow-hidden rounded-xl border-2">
                        <DrawingReplayCanvas
                          strokes={highlight.playerStrokes}
                          speed={30}
                          loop={true}
                          className="h-full w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-content-disabled py-10 text-center">
                  리플레이 없음
                </p>
              )}
            </div>
          </div>

          {/* 오른쪽: 순위 및 버튼 */}
          <div className="flex w-full flex-col items-center gap-10 lg:w-2/5 lg:items-start">
            <div className="flex w-full flex-row items-end justify-center gap-4 sm:gap-6 lg:justify-start">
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

            <div className="flex w-full flex-col items-center gap-4 lg:items-start">
              {isHost && (
                <div className="flex w-full max-w-md justify-center lg:justify-start">
                  <CommonBtn
                    variant="radius"
                    icon="replay"
                    text="다시하기"
                    onClick={handleRestart}
                    disabled={!isButtonEnabled}
                  />
                </div>
              )}

              <p className="text-content-disabled text-sm">
                {timer}초 후 자동으로 대기실로 이동합니다
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
