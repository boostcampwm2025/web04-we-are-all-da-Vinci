export function EmptySlot() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-4 text-center opacity-50">
      <div className="mx-auto mb-2 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100">
        <span className="material-symbols-outlined text-4xl text-gray-300">
          +
        </span>
      </div>
      <div className="font-handwriting text-sm text-gray-400">빈자리</div>
      <div className="font-handwriting text-sm text-transparent">
        placeholder
      </div>
    </div>
  );
}
