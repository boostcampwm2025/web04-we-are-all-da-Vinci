interface PlayerReplayPaginationProps {
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

const PlayerReplayPagination = ({
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
}: PlayerReplayPaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrevPage}
        disabled={currentPage === 0}
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-indigo-400 bg-white text-indigo-600 transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 md:h-8 md:w-8"
      >
        <span className="material-symbols-outlined text-lg">chevron_left</span>
      </button>
      <span className="text-xs font-semibold text-gray-700 md:text-sm">
        {currentPage + 1} / {totalPages}
      </span>
      <button
        onClick={onNextPage}
        disabled={currentPage === totalPages - 1}
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-indigo-400 bg-white text-indigo-600 transition-all hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 md:h-8 md:w-8"
      >
        <span className="material-symbols-outlined text-lg">chevron_right</span>
      </button>
    </div>
  );
};

export default PlayerReplayPagination;
