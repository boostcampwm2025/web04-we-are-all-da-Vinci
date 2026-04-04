import { HEIGHTS, WIDTH } from "../config/podiumStyles";
import type { Ranking } from "../model/types";
interface PodiumProps {
  rankings: Ranking[];
}

const clipName = (name: string): string => {
  if (name.length > 4) {
    name = name.substring(0, 4) + "...";
  }
  return name;
};

export const Podium = ({ rankings }: PodiumProps) => {
  const podium = [
    { ...rankings[1], rank: 2 },
    { ...rankings[0], rank: 1 },
    { ...rankings[2], rank: 3 },
  ].map((ranking) => ({
    ...ranking,
    name: clipName(ranking.name),
    totalSimilarity: String(ranking.totalSimilarity) + "점",
  }));

  return (
    <div
      className="flex flex-col justify-end w-full rounded-[8px] bg-[#F9FAFB] px-4"
      style={{ height: 205 }}
    >
      <div className="flex items-end justify-center gap-2 pb-16">
        {podium.map((ranking) => (
          <div
            key={ranking.rank}
            className="flex flex-col items-center justify-end gap-2"
          >
            <div className="flex flex-col mb-3 text-center gap-1">
              <div className="w-[75px] truncate text-[16px] font-bold leading-tight text-black">
                {ranking.name}
              </div>
              <div className="mt-1 text-[14px] leading-none text-[#8f97a3]">
                {ranking.totalSimilarity}
              </div>
            </div>

            <div
              className="flex items-end justify-center bg-[#E5E8EB] text-[14px] font-semibold text-white"
              style={{
                width: WIDTH,
                height: HEIGHTS[ranking.rank],
              }}
            >
              {ranking.rank}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
