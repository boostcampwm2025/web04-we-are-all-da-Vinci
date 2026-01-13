import { PodiumPlayer } from '@/entities/gameResult';
import { useGameStore, useIsHost } from '@/entities/gameRoom/model';
import { DrawingReplayCanvas } from '@/features/replayingCanvas';
import { getSocket } from '@/shared/api/socket';
import { PATHS, SERVER_EVENTS, TITLES } from '@/shared/config';
import { CommonBtn, Title } from '@/shared/ui';

const GAME_END_TOTAL_TIME = 30; // 서버와 동일하게 30초
const BUTTON_ENABLE_AFTER = 10; // 10초 후 버튼 활성화

export const GameEnd = () => {
  const finalResults = useGameStore((state) => state.finalResults);
  const settings = useGameStore((state) => state.settings);
  const highlight = useGameStore((state) => state.highlight);
  const roomId = useGameStore((state) => state.roomId);
  const timer = useGameStore((state) => state.timer);
  const reset = useGameStore((state) => state.reset);
  const isHost = useIsHost();

  const topThree = finalResults.slice(0, 3);
  const isButtonEnabled = timer <= GAME_END_TOTAL_TIME - BUTTON_ENABLE_AFTER;

  const handleRestart = () => {
    if (!isButtonEnabled) return;

    // 서버에 ROOM_RESTART 이벤트 전송하여 방 상태를 WAITING으로 변경
    const socket = getSocket();
    socket.emit(SERVER_EVENTS.ROOM_RESTART, { roomId });

    // 상태 초기화 후 페이지 새로고침
    reset();
    window.location.href = `${PATHS.GAME}/${roomId}`;
  };

  return (
    <div className="h-screen">
      <main className="flex h-full flex-col items-center justify-center px-4 py-12">
        <div className="flex w-full flex-col">
          <div className="mb-5 shrink-0 text-center">
            <Title title={TITLES.END} fontSize="text-6xl" />
            <div className="mx-auto mt-1 h-1.5 w-40 rounded-full bg-yellow-300" />
          </div>
        </div>

        <div className="flex h-full w-full max-w-7xl flex-col items-center justify-center gap-8 lg:flex-row lg:items-center lg:gap-16">
          {/* 왼쪽: POTG 카드 (그림 강조 - 가로로 넓게) */}
          <div className="flex w-full justify-center lg:w-3/5 lg:justify-end">
            <div className="flex w-full max-w-3xl flex-col rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between border-b border-dashed border-gray-300 pb-2">
                <div className="font-handwriting text-2xl text-gray-800">
                  <span className="material-symbols-outlined mr-1 align-middle text-yellow-500">
                    leaderboard
                  </span>
                  1등 POTG!!
                </div>
                <span className="text-sm text-gray-500">
                  총 라운드: {settings.totalRounds}
                </span>
              </div>

              {highlight ? (
                <div className="flex flex-col items-center gap-6">
                  <p className="font-handwriting text-lg text-gray-600">
                    유사도: {highlight.similarity.toFixed(1)}%
                  </p>

                  {/* 이미지 가로 배치 (md 이상에서) */}
                  <div className="flex w-full flex-col gap-6 md:flex-row">
                    {/* 제시 이미지 */}
                    <div className="flex-1">
                      <p className="mb-2 text-center text-sm text-gray-500">
                        제시 이미지
                      </p>
                      <div className="aspect-square w-full overflow-hidden rounded-xl border-2 border-gray-200 bg-white">
                        <DrawingReplayCanvas
                          strokes={highlight.promptStrokes}
                          speed={30}
                          loop={true}
                          className="h-full w-full"
                        />
                      </div>
                    </div>
                    {/* 1등 그림 */}
                    <div className="flex-1">
                      <p className="mb-2 text-center text-sm text-gray-500">
                        1등 그림
                      </p>
                      <div className="aspect-square w-full overflow-hidden rounded-xl border-2 border-yellow-400 bg-white">
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
                <p className="py-10 text-center text-gray-400">리플레이 없음</p>
              )}
            </div>
          </div>

          {/* 오른쪽: 순위 및 버튼 */}
          <div className="flex w-full flex-col items-center gap-10 pt-4 lg:w-2/5 lg:items-start">
            <div className="flex w-full flex-col items-end justify-center gap-6 sm:flex-row lg:justify-start">
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

              <p className="text-sm text-gray-400">
                {timer}초 후 자동으로 대기실로 이동합니다
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
