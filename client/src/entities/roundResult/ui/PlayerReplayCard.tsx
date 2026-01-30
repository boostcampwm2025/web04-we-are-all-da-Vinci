import { PlayerSimilarityDetailTooltip } from '@/entities/similarity';
import type { Stroke } from '@/entities/similarity/model';
import { DrawingReplayCanvas } from '@/features/replayingCanvas';
import type { Similarity } from '@/features/similarity';
import { UserAvatar } from '@/shared/ui';
import { useState } from 'react';
import { getRankStyles } from '../lib/rankStyles';

interface PlayerReplayCardProps {
  rank: number;
  nickname: string;
  profileId: string;
  similarity: Similarity;
  strokes: Stroke[];
  isCurrentUser?: boolean;
}

const PlayerReplayCard = ({
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

  const rankStyles = getRankStyles(rank);

  return (
    <div
      className="relative flex h-full w-full flex-col"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Similarity Detail Tooltip */}
      {isHovered && (
        <div className="absolute top-0 left-full z-20 ml-2 w-48">
          <PlayerSimilarityDetailTooltip similarity={similarity} />
        </div>
      )}

      <div
        className={`flex h-full w-full flex-col rounded-xl border-2 p-2 shadow-lg transition-colors ${rankStyles.border} ${rankStyles.bg}`}
      >
        {/* Player Info Header */}
        <div className="mb-1 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold ${rankStyles.badge}`}
            >
              {rank}
            </span>
            <UserAvatar name={profileId} size={24} />
            <h3 className="font-handwriting truncate text-base font-bold">
              {nickname}
              {isCurrentUser && ' (나)'}
            </h3>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-gray-50">
          <div className="absolute inset-0 flex items-center justify-center">
            {strokes.length > 0 ? (
              <DrawingReplayCanvas
                strokes={strokes}
                speed={0}
                loop={true}
                className="max-h-full max-w-full rounded-lg border-2 border-gray-300"
              />
            ) : (
              <span className="text-xs text-gray-400">그림 없음</span>
            )}
          </div>
        </div>

        {/* Similarity Score */}
        <div className="mt-1 shrink-0">
          <div className="mb-0.5 flex items-center justify-between">
            <span className="font-handwriting text-sm font-semibold text-gray-700">
              유사도
            </span>
            <span
              className={`font-handwriting text-lg font-bold ${rankStyles.text || 'text-blue-600'}`}
            >
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
export default PlayerReplayCard;
