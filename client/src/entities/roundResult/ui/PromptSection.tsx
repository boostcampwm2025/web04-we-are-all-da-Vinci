import { StaticCanvas } from '@/entities/drawing';
import type { Stroke } from '@/entities/similarity';

interface PromptSectionProps {
  promptStrokes: Stroke[];
}

const PromptSection = ({ promptStrokes }: PromptSectionProps) => {
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex shrink-0 items-center gap-1.5">
        <span className="material-symbols-outlined text-base text-yellow-500">
          image
        </span>
        <h2 className="font-handwriting text-2xl font-bold text-gray-800">
          제시된 그림
        </h2>
      </div>
      <div className="flex aspect-square w-full flex-col overflow-hidden rounded-xl border-4 border-yellow-300 bg-white p-2 shadow-xl">
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg bg-gray-50">
          <StaticCanvas
            strokes={promptStrokes}
            className="rounded-lg border-2 border-gray-300"
          />
        </div>
      </div>
    </div>
  );
};
export default PromptSection;
