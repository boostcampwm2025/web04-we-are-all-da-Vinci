export const EmptySlot = () => {
  return (
    <div className="border-stroke-default flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-2 text-center opacity-50 sm:p-4 lg:p-6">
      <div className="bg-surface-muted mx-auto mb-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14 lg:h-20 lg:w-20">
        <span className="material-symbols-outlined text-content-placeholder text-2xl sm:text-3xl lg:text-4xl">
          +
        </span>
      </div>
      <div className="font-handwriting text-content-disabled text-xs sm:text-sm">
        빈자리
      </div>
      <div className="font-handwriting text-xs text-transparent sm:text-sm">
        placeholder
      </div>
    </div>
  );
};
