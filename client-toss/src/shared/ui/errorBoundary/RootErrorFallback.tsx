interface RootErrorFallbackProps {
  onRetry: () => void;
}

/**
 * 최상위(TDSMobileAITProvider 바깥) 경계의 폴백 — TDS를 쓸 수 없는 위치라 순수 마크업으로만 그린다.
 */
const RootErrorFallback = ({ onRetry }: RootErrorFallbackProps) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 px-(--page-px) text-center">
    <p className="text-lg font-bold">화면을 그리다가 문제가 생겼어요</p>
    <p className="text-sm text-(--color-grey)">잠시 후 다시 시도해 주세요</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-3 rounded-2xl bg-(--color-toss-blue) px-6 py-3 font-semibold text-white"
    >
      다시 시도
    </button>
  </div>
);

export default RootErrorFallback;
