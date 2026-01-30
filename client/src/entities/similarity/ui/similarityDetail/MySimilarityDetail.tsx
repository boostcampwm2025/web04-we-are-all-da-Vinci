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

interface MySimilarityDetailProps {
  similarity: Similarity;
}

const MySimilarityDetail = ({ similarity }: MySimilarityDetailProps) => {
  return (
    <div className="flex shrink-0 flex-col">
      <div className="mb-2 flex shrink-0 items-center gap-1.5">
        <span className="material-symbols-outlined text-base text-blue-500">
          analytics
        </span>
        <h2 className="font-handwriting text-xl font-bold text-gray-800">
          내 유사도 분석
        </h2>
      </div>
      <div className="flex flex-col gap-2 rounded-xl border-4 border-blue-300 bg-white p-3 shadow-xl">
        {/* 전체 유사도 */}
        <div className="mb-1 flex items-center justify-between border-b border-gray-200 pb-2">
          <span className="font-handwriting text-sm font-semibold text-gray-700">
            전체 유사도
          </span>
          <span className="font-handwriting text-2xl font-bold text-blue-500">
            {similarity.similarity}%
          </span>
        </div>
        {/* 상세 유사도 */}
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
    </div>
  );
};
export default MySimilarityDetail;
