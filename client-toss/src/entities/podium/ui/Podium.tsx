import { Skeleton } from "@toss/tds-mobile";
import { HEIGHTS, WIDTH } from "../config/podiumStyles";
import { usePodium } from "../hooks/usePodium";
import type { PodiumEntry } from "../model/types";
import PodiumEmpty from "./PodiumEmpty";

type PodiumSlot = {
  rank: number;
  entry?: PodiumEntry;
};

const clipName = (name: string): string => {
  if (name.length > 4) {
    name = name.substring(0, 4) + "...";
  }
  return name;
};

const Podium = () => {
  const { podium, isLoading } = usePodium();

  if (isLoading) {
    return <Skeleton pattern="listOnly" style={{ width: "100%" }} />;
  }

  if (!podium || podium.length === 0) {
    return <PodiumEmpty />;
  }

  const order = [2, 1, 3]; // 렌더링 순서

  const slots: PodiumSlot[] = order.map((rank) => ({
    rank,
    entry: podium[rank - 1], // podium은 1등부터 시작
  }));

  return (
    <div
      className="flex flex-col justify-end w-full  bg-[#F9FAFB] px-4"
      style={{ height: 205 }}
    >
      <div className="flex items-end justify-center gap-2 pb-4">
        {slots.map(({ rank, entry }) => (
          <div
            key={rank}
            className="flex flex-col items-center justify-end gap-2"
          >
            <div className="flex flex-col text-center">
              <div className="w-[75px] truncate text-[16px] font-bold leading-tight text-black">
                {entry ? clipName(entry.name) : ""}
              </div>
              <div className="mt-1 text-[14px] leading-none text-[#8f97a3]">
                {entry ? `${entry.score}점` : ""}
              </div>
            </div>

            <div
              data-testid="podium-slot"
              className="flex items-end justify-center bg-[#E5E8EB] text-[14px] font-semibold text-white"
              style={{
                width: WIDTH,
                height: HEIGHTS[rank],
              }}
            >
              {rank}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Podium;
