const SKELETON_COUNT = 3;

const QuestCardSkeleton = () => (
  <div className="flex flex-col gap-3 px-(--page-px) pt-4">
    {Array.from({ length: SKELETON_COUNT }, (_, i) => (
      <div
        key={i}
        className="card animate-pulse px-4 py-4"
        role="status"
        aria-label="퀘스트 로딩 중"
      >
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-4 w-3/5 rounded bg-(--color-grey)/20" />
            <div className="h-3 w-full rounded bg-(--color-grey)/20" />
          </div>
          <div className="h-8 w-16 shrink-0 rounded-full bg-(--color-grey)/20" />
        </div>
      </div>
    ))}
  </div>
);

export default QuestCardSkeleton;
