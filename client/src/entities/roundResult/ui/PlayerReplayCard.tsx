import { useState } from 'react';
import type { Stroke } from '@/entities/similarity/model';
import { DrawingReplayCanvas } from '@/features/replayingCanvas';
import type { Similarity } from '@/features/similarity';
import { PlayerSimilarityDetailTooltip } from '@/entities/similarity';
import { UserAvatar } from '@/shared/ui';

const getRankColor = (rank: number) => {
  if (rank === 1) return 'bg-yellow-400 text-yellow-900';
  if (rank === 2) return 'bg-indigo-400 text-indigo-900';
  if (rank === 3) return 'bg-red-400 text-red-900';
  return 'bg-gray-300 text-gray-700';
};

interface PlayerReplayCardProps {
  rank: number;
  nickname: string;
  profileId: string;
  similarity: Similarity;
  strokes: Stroke[];
  isCurrentUser?: boolean;
}

export const PlayerReplayCard = ({
  rank,
  nickname,
  profileId,
  similarity,
  strokes,
  isCurrentUser = false,
}: PlayerReplayCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      className="relative flex flex-col"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Similarity Detail Tooltip */}
      {isHovered && (
        <div className="absolute top-0 left-full z-20 ml-2 w-48">
          <PlayerSimilarityDetailTooltip similarity={similarity} />
        </div>
      )}

      <div className="flex flex-col rounded-xl border-2 border-gray-800 bg-white p-2 shadow-lg">
        {/* Player Info Header */}
        <div className="mb-1 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold ${getRankColor(rank)}`}
            >
              #{rank}
            </span>
            <UserAvatar name={profileId} className="h-8 w-8" />
            <h3 className="font-handwriting truncate text-base font-bold">
              {nickname}
              {isCurrentUser && ' (You)'}
            </h3>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border-1 border-gray-300 bg-gray-50">
          {strokes.length > 0 ? (
            <div className="flex h-full w-full items-center justify-center">
              <DrawingReplayCanvas
                strokes={strokes}
                speed={0}
                loop={true}
                className="max-h-full max-w-full rounded-lg border-2 border-gray-300"
              />
            </div>
          ) : (
            <span className="text-xs text-gray-400">그림 없음</span>
          )}
        </div>

        {/* Similarity Score */}
        <div className="mt-1 shrink-0">
          <div className="mb-0.5 flex items-center justify-between">
            <span className="font-handwriting text-sm font-semibold text-gray-700">
              유사도
            </span>
            <span className="font-handwriting text-lg font-bold text-blue-600">
              {similarity.similarity}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full bg-blue-600"
              style={{ width: `${similarity.similarity}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
