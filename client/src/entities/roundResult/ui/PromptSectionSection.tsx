import { StaticCanvas } from '@/entities/drawing';
import type { Stroke } from '@/entities/similarity/model';

interface PromptSectionProps {
  promptStrokes: Stroke[];
}

export const PromptSection = ({ promptStrokes }: PromptSectionProps) => {
  return (
    <div className="flex w-1/3 flex-col">
      <div className="mb-2 flex shrink-0 items-center gap-1.5">
        <span className="material-symbols-outlined text-base text-yellow-500">
          image
        </span>
        <h2 className="font-handwriting text-xl font-bold text-gray-800">
          제시된 그림
        </h2>
      </div>
      <div className="flex flex-col overflow-hidden rounded-xl border-4 border-yellow-300 bg-white p-2 shadow-xl">
        <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-50">
          <StaticCanvas
            strokes={promptStrokes}
            className="rounded-lg border-2 border-gray-300"
          />
        </div>
      </div>
    </div>
  );
};
