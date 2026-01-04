interface ReferenceImageCardProps {
  playerName: string;
  rank: number;
  imageUrl?: string;
}

export const ReferenceImageCard = ({
  playerName,
  rank,
  imageUrl,
}: ReferenceImageCardProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-full flex-col rounded-xl border-2 border-gray-800 bg-white p-3 shadow-lg">
        <div className="mb-2 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-base text-blue-600">
              category
            </span>
            <h3 className="font-handwriting text-sm font-bold">
              Replaying: {playerName}
            </h3>
          </div>
          <div className="rounded-full bg-yellow-300 px-2 py-0.5 text-xs font-bold text-yellow-900">
            Best #{rank}
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-50 p-8">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Reference"
              className="h-full w-full object-contain"
            />
          )}
        </div>
        <div className="mt-2 shrink-0 text-center">
          <span className="font-handwriting text-xs text-gray-600">
            Reference
          </span>
        </div>
      </div>
    </div>
  );
}
