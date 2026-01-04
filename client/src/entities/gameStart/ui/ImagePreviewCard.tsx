interface ImagePreviewCardProps {
  imageUrl?: string;
  label?: string;
}

export function ImagePreviewCard({ imageUrl, label }: ImagePreviewCardProps) {
  return (
    <div className="relative w-full max-w-2xl rounded-2xl border-4 border-gray-800 bg-white p-3 shadow-2xl">
      <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-lg bg-[#4a5f5a]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Preview"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="h-40 w-40 rounded-lg bg-gray-300 shadow-lg"></div>
        )}

        {label && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border-2 border-gray-300 bg-white/90 px-4 py-1.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-gray-600">
                draw
              </span>
              <span className="text-sm font-medium text-gray-700">
                {label}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
