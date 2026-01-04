interface PlayerDrawingCardProps {
  similarity: number;
  imageUrl?: string;
  onClose?: () => void;
}

export const PlayerDrawingCard = ({
  similarity,
  imageUrl,
  onClose,
}: PlayerDrawingCardProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-full flex-col rounded-xl border-2 border-gray-800 bg-white p-3 shadow-lg">
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <h3 className="font-handwriting text-sm font-bold">Drawing</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-50 p-8">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Player drawing"
              className="h-full w-full object-contain"
            />
          )}
        </div>
        <div className="mt-2 shrink-0">
          <div className="text-center">
            <span className="font-handwriting text-sm font-bold text-blue-600">
              유사도: {similarity}%
            </span>
          </div>
          <div className="mt-1">
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${similarity}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
