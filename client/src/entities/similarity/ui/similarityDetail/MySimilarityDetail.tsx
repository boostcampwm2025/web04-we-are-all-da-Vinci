import type { Similarity } from '@/features/similarity';

const SIMILARITY_ITEMS: {
  key: keyof Similarity;
  label: string;
  shortLabel: string;
  color: string;
}[] = [
  {
    key: 'strokeCountSimilarity',
    label: '선 개수 유사도',
    shortLabel: '선 개수',
    color: 'bg-yellow-400',
  },
  {
    key: 'strokeMatchSimilarity',
    label: '선 매칭 유사도',
    shortLabel: '선 매칭',
    color: 'bg-indigo-400',
  },
  {
    key: 'shapeSimilarity',
    label: '형태 유사도',
    shortLabel: '형태',
    color: 'bg-red-400',
  },
];

interface MySimilarityDetailProps {
  similarity: Similarity;
}

const MySimilarityDetail = ({ similarity }: MySimilarityDetailProps) => {
  return (
    <div className="flex shrink-0 flex-col">
      <div className="mb-2 flex shrink-0 items-center gap-1.5 md:flex">
        <span className="material-symbols-outlined text-base text-blue-500">
          analytics
        </span>
        <h2 className="font-handwriting text-xl font-bold text-gray-800 md:text-2xl">
          내 유사도 분석
        </h2>
      </div>

      <div className="flex flex-col gap-1 rounded-xl border-2 border-blue-300 bg-white p-1 shadow-lg md:border-4 md:p-3 md:shadow-xl">
        {/* 전체 유사도 */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-1 md:mb-1 md:border-gray-200">
          <span className="font-handwriting text-sm font-semibold text-gray-700 md:text-base">
            전체 유사도
          </span>
          <span className="font-handwriting text-2xl font-bold text-blue-500 md:text-3xl">
            {similarity.similarity}%
          </span>
        </div>

        {/* 상세 유사도: 모바일에서는 3컬럼 그리드, 데스크탑은 리스트 */}
        <div className="grid grid-cols-3 gap-2 md:flex md:flex-col md:gap-2">
          {SIMILARITY_ITEMS.map(({ key, label, shortLabel, color }) => (
            <div
              key={key}
              className="flex flex-col items-center border-r border-gray-100 last:border-0 md:block md:items-start md:border-0"
            >
              <div className="mb-0.5 flex flex-col items-center justify-between md:flex-row md:items-start">
                <span className="font-handwriting text-xs font-semibold text-gray-500 md:text-base md:text-gray-700">
                  <span className="md:hidden">{shortLabel}</span>
                  <span className="hidden md:inline">{label}</span>
                </span>
                <span
                  className={`font-handwriting text-base font-bold md:text-xl ${color.replace('bg-', 'text-')}`}
                >
                  {similarity[key]}%
                </span>
              </div>
              {/* 프로그레스 바 (데스크탑에서만 유지 가능하게 구조는 둠, 현재는 hidden) */}
              <div className="hidden h-1.5 w-full rounded-full bg-gray-200 md:block">
                <div
                  className={`h-1.5 rounded-full ${color}`}
                  style={{ width: `${similarity[key]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default MySimilarityDetail;
