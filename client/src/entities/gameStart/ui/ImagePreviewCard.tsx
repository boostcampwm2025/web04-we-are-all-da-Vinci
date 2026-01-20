import { StaticCanvas } from '@/entities/drawing';
import type { Stroke } from '@/entities/similarity';

interface ImagePreviewCardProps {
  promptStrokes: Stroke[];
  label?: string;
}

export const ImagePreviewCard = ({
  promptStrokes,
  label,
}: ImagePreviewCardProps) => {
  return (
    <div className="canvas-frame border-gray-800 bg-white shadow-2xl">
      <div className="relative h-full w-full overflow-hidden">
        <StaticCanvas strokes={promptStrokes ?? []} className="h-full w-full" />

        {label && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border-2 border-gray-300 bg-white/90 px-4 py-1.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-gray-600">
                draw
              </span>
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
