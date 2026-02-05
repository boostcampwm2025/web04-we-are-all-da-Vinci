import type { Similarity } from '@/features/similarity';
import { SIMILARITY_ITEMS } from '../config/similarityItems';

const PlayerSimilarityDetailTooltip = ({
  similarity,
}: {
  similarity: Similarity;
}) => {
  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-gray-800 bg-white p-2 shadow-lg">
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-200">
        {SIMILARITY_ITEMS.map(({ key, color }) => (
          <div
            key={key}
            className={`h-full ${color}`}
            style={{ width: `${similarity[key]}%` }}
          />
        ))}
      </div>
      <div className="flex flex-col justify-between">
        {SIMILARITY_ITEMS.map(({ key, shortLabel, color }) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`h-3 w-3 rounded-sm ${color}`} />
            <span className="font-handwriting text-xs text-gray-600">
              {shortLabel}
            </span>
            <span
              className={`font-handwriting text-sm font-bold ${color.replace('bg-', 'text-')}`}
            >
              {similarity[key]}%
            </span>
          </div>
        ))}
      </div>

      {/* {SIMILARITY_ITEMS.map(({ key, label, color }) => (
        <div key={key}>
          <div className="mb-0.5 flex items-center justify-between">
            <span className="font-handwriting text-sm font-semibold text-gray-700">
              {label}
            </span>
            <span
              className={`font-handwriting text-lg font-bold ${color.replace('bg-', 'text-')}`}
            >
              {similarity[key]}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-200">
            <div
              className={`h-1.5 rounded-full ${color}`}
              style={{ width: `${similarity[key]}%` }}
            />
          </div>
        </div>
      ))} */}
    </div>
  );
};

export default PlayerSimilarityDetailTooltip;
