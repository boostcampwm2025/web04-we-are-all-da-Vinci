import type { Similarity } from '@/features/similarity';
import { SIMILARITY_ITEMS } from '../config/similarityItems';

interface MySimilarityDetailProps {
  similarity: Similarity;
}

const MySimilarityDetail = ({ similarity }: MySimilarityDetailProps) => {
  return (
    <div className="flex min-h-30 flex-1 flex-col overflow-auto md:min-h-45">
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

        {/* 상세 유사도: 모바일에서는 3컬럼 그리드 */}
        <div className="grid grid-cols-3 gap-2 md:hidden">
          {SIMILARITY_ITEMS.map(({ key, shortLabel, color }) => (
            <div
              key={key}
              className="flex flex-col items-center border-r border-gray-100 last:border-0"
            >
              <div className="mb-0.5 flex flex-col items-center">
                <span className="font-handwriting text-[10px] font-semibold text-gray-500">
                  {shortLabel}
                </span>
                <span
                  className={`font-handwriting text-sm font-bold ${color.replace('bg-', 'text-')}`}
                >
                  {similarity[key]}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 데스크탑: 스택형 프로그레스 바 */}
        <div className="hidden flex-col gap-2 md:flex">
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-200">
            {SIMILARITY_ITEMS.map(({ key, color }) => (
              <div
                key={key}
                className={`h-full ${color}`}
                style={{ width: `${similarity[key]}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between">
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
        </div>
      </div>
    </div>
  );
};
export default MySimilarityDetail;
