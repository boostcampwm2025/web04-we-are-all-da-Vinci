interface DrawingToolbarProps {
  onColorSelect?: (color: string) => void;
  onUndo?: () => void;
  onClear?: () => void;
  canUndo?: boolean;
}

export const DrawingToolbar = ({
  onColorSelect,
  onUndo,
  onClear,
  canUndo = false,
}: DrawingToolbarProps) => {
  return (
    <div className="flex shrink-0 items-center gap-4 border-b-2 border-gray-300 bg-gray-100 px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onColorSelect?.('black')}
          className="h-8 w-8 rounded-full border-2 border-gray-400 bg-black transition-transform hover:scale-110"
        ></button>
        <button
          onClick={() => onColorSelect?.('red')}
          className="h-8 w-8 rounded-full border-2 border-gray-300 bg-red-500 transition-transform hover:scale-110"
        ></button>
        <button
          onClick={() => onColorSelect?.('blue')}
          className="h-8 w-8 rounded-full border-2 border-gray-300 bg-blue-500 transition-transform hover:scale-110"
        ></button>
        <button
          onClick={() => onColorSelect?.('green')}
          className="h-8 w-8 rounded-full border-2 border-gray-300 bg-green-500 transition-transform hover:scale-110"
        ></button>
        <button
          onClick={() => onColorSelect?.('yellow')}
          className="h-8 w-8 rounded-full border-2 border-gray-300 bg-yellow-400 transition-transform hover:scale-110"
        ></button>
      </div>

      <div className="h-6 w-px bg-gray-400"></div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-lg p-2 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-gray-700">undo</span>
        </button>
      </div>

      <div className="h-6 w-px bg-gray-400"></div>

      <button
        onClick={onClear}
        className="flex items-center gap-1 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100"
      >
        <span className="material-symbols-outlined">delete</span>
        <span className="font-handwriting text-sm font-bold">지우기</span>
      </button>
    </div>
  );
};
