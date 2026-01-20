export const EmptySlot = () => {
  return (
    <div className="border-stroke-default flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center opacity-50">
      <div className="bg-surface-muted mx-auto mb-2 flex h-20 w-20 shrink-0 items-center justify-center rounded-full">
        <span className="material-symbols-outlined text-content-placeholder text-4xl">
          +
        </span>
      </div>
      <div className="font-handwriting text-content-disabled text-sm">
        빈자리
      </div>
      <div className="font-handwriting text-sm text-transparent">
        placeholder
      </div>
    </div>
  );
};
