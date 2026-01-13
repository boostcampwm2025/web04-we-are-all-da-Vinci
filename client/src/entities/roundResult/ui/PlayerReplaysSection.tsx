import { useState } from 'react';
import type { Stroke } from '@/entities/similarity/model';
import { PlayerReplayCard } from './PlayerReplayCard';
import { useCurrentPlayer } from '@/entities/gameRoom/model';

interface Player {
  nickname: string;
  similarity: number;
  strokes: Stroke[];
  socketId: string;
}

interface PlayerReplaysSectionProps {
  players: Player[];
}

const PLAYERS_PER_PAGE = 8;

export const PlayerReplaysSection = ({
  players = [],
}: PlayerReplaysSectionProps) => {
  const [currentPage, setCurrentPage] = useState(0);

  const currentPlayer = useCurrentPlayer();
  const mySocketId = currentPlayer?.socketId;

  // 페이지네이션 계산
  const totalPages = Math.max(1, Math.ceil(players.length / PLAYERS_PER_PAGE));
  const startIndex = currentPage * PLAYERS_PER_PAGE;
  const currentPlayers = players.slice(
    startIndex,
    startIndex + PLAYERS_PER_PAGE,
  );

  const goToPrevPage = () => setCurrentPage((prev) => Math.max(0, prev - 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex shrink-0 items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-indigo-500">
            replay
          </span>
          <h2 className="font-handwriting text-xl font-bold text-gray-800">
            플레이어 리플레이
          </h2>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-indigo-400 bg-white text-indigo-600 transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-lg">
                chevron_left
              </span>
            </button>
            <span className="text-sm font-semibold text-gray-700">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages - 1}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-indigo-400 bg-white text-indigo-600 transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-lg">
                chevron_right
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {currentPlayers.map((player, index) => {
          const isCurrentUser = player.socketId === mySocketId;
          const rank = startIndex + index + 1;

          return (
            <PlayerReplayCard
              key={player.socketId}
              rank={rank}
              nickname={player.nickname}
              similarity={player.similarity}
              strokes={player.strokes}
              isCurrentUser={isCurrentUser}
            />
          );
        })}
      </div>
    </div>
  );
};
