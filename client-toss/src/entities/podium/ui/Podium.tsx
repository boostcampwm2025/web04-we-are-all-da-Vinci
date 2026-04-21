import { HEIGHTS, WIDTH } from "../config/podiumStyles";
import type { PodiumEntry } from "../model/types";
interface PodiumProps {
  entries: PodiumEntry[];
}

const clipName = (name: string): string => {
  if (name.length > 4) {
    name = name.substring(0, 4) + "...";
  }
  return name;
};

const Podium = ({ entries }: PodiumProps) => {
  const podium = [
    { ...entries[1], rank: 2 },
    { ...entries[0], rank: 1 },
    { ...entries[2], rank: 3 },
  ].map((entry) => ({
    ...entry,
    name: clipName(entry.name),
    totalSimilarity: String(entry.totalSimilarity) + "점",
  }));

  return (
    <div
      className="flex flex-col justify-end w-full  bg-[#F9FAFB] px-4"
      style={{ height: 205 }}
    >
      <div className="flex items-end justify-center gap-2 pb-4">
        {podium.map((entry) => (
          <div
            key={entry.rank}
            className="flex flex-col items-center justify-end gap-2"
          >
            <div className="flex flex-col text-center">
              <div className="w-[75px] truncate text-[16px] font-bold leading-tight text-black">
                {entry.name}
              </div>
              <div className="mt-1 text-[14px] leading-none text-[#8f97a3]">
                {entry.totalSimilarity}
              </div>
            </div>

            <div
              className="flex items-end justify-center bg-[#E5E8EB] text-[14px] font-semibold text-white"
              style={{
                width: WIDTH,
                height: HEIGHTS[entry.rank],
              }}
            >
              {entry.rank}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Podium;
