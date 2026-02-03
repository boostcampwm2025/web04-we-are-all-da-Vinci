import type { Similarity } from '@/features/similarity';

const SIMILARITY_ITEMS: {
  key: keyof Similarity;
  label: string;
  color: string;
}[] = [
  {
    key: 'strokeCountSimilarity',
    label: '선 개수 유사도',
    color: 'bg-yellow-400',
  },
  {
    key: 'strokeMatchSimilarity',
    label: '선 매칭 유사도',
    color: 'bg-indigo-400',
  },
  { key: 'shapeSimilarity', label: '형태 유사도', color: 'bg-red-400' },
];

const PlayerSimilarityDetailTooltip = ({
  similarity,
}: {
  similarity: Similarity;
}) => {
  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-gray-800 bg-white p-2 shadow-lg">
      {SIMILARITY_ITEMS.map(({ key, label, color }) => (
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
      ))}
    </div>
  );
};

export default PlayerSimilarityDetailTooltip;
