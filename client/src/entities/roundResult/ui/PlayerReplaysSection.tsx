import { useCurrentPlayer } from '@/entities/gameRoom';
import type { Stroke } from '@/entities/similarity';
import type { Similarity } from '@/features/similarity';
import {
  MOBILE_BREAKPOINT,
  PLAYERS_PER_PAGE,
  getGridLayout,
} from '../lib/gridLayout';
import { usePlayerPagination } from '../model/usePlayerPagination';
import { useResponsiveCardSize } from '../model/useResponsiveCardSize';
import PlayerReplayCard from './PlayerReplayCard';
import PlayerReplayPagination from './PlayerReplayPagination';
import { useMediaQuery } from '@/shared/model';

interface Player {
  nickname: string;
  profileId: string;
  similarity: Similarity;
  strokes: Stroke[];
  socketId: string;
}

interface PlayerReplaysSectionProps {
  players: Player[];
}

const PlayerReplaysSection = ({ players = [] }: PlayerReplaysSectionProps) => {
  const currentPlayer = useCurrentPlayer();
  const mySocketId = currentPlayer?.socketId;
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);

  // 페이지네이션
  const {
    currentPage,
    totalPages,
    startIndex,
    currentPlayers,
    goToPrevPage,
    goToNextPage,
  } = usePlayerPagination(players, isMobile);

  // 8명 초과 시(페이지네이션 있을 때) 모든 페이지에서 8명 기준 레이아웃 유지
  const layoutPlayerCount =
    totalPages > 1 ? PLAYERS_PER_PAGE : currentPlayers.length;
  const layout = getGridLayout(layoutPlayerCount, isMobile);

  const { containerRef, cardSize } = useResponsiveCardSize(
    layout.cols,
    layout.rows,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between md:justify-start md:gap-4">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-indigo-500">
            replay
          </span>
          <h2 className="font-handwriting text-sm font-bold text-gray-800 md:text-xl">
            플레이어 리플레이
          </h2>
        </div>

        <PlayerReplayPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevPage={goToPrevPage}
          onNextPage={goToNextPage}
        />
      </div>

      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 flex-wrap items-center justify-center gap-2"
      >
        {currentPlayers.map((player, index) => {
          const isCurrentUser = player.socketId === mySocketId;
          const rank = startIndex + index + 1;

          return (
            <div
              key={player.socketId}
              style={{
                width: cardSize.width > 0 ? cardSize.width : 'auto',
                height: cardSize.height > 0 ? cardSize.height : 'auto',
              }}
            >
              <PlayerReplayCard
                rank={rank}
                nickname={player.nickname}
                profileId={player.profileId}
                similarity={player.similarity}
                strokes={player.strokes}
                isCurrentUser={isCurrentUser}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default PlayerReplaysSection;
