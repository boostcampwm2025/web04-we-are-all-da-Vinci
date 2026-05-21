import { Skeleton } from "@toss/tds-mobile";
import { HEIGHTS, WIDTH } from "../config/podiumStyles";
import { usePodium } from "../hooks/usePodium";
import type { PodiumEntry } from "../model/types";
import PodiumEmpty from "./PodiumEmpty";

type PodiumSlot = {
  rank: number;
  entry?: PodiumEntry;
};

const RANK_COLOR_CLASS: Record<number, string> = {
  1: "bg-(--color-gold) text-white",
  2: "bg-(--color-silver) text-white",
  3: "bg-(--color-bronze) text-white",
};

const clipNickname = (nickname: string): string => {
  if (nickname.length > 10) {
    return nickname.substring(0, 10) + "...";
  }
  return nickname;
};

const Podium = () => {
  const { podium, isLoading } = usePodium();

  if (isLoading) {
    return <Skeleton pattern="cardOnly" style={{ width: "100%" }} />;
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
      className="card flex w-full flex-col justify-end px-4"
      style={{ height: 205 }}
    >
      <div className="flex items-end justify-center gap-2 pb-4">
        {slots.map(({ rank, entry }) => (
          <div
            key={rank}
            className="flex flex-col items-center justify-end gap-2"
          >
            <div className="flex flex-col text-center">
              <div className="w-[98px] truncate text-[13px] font-bold leading-tight text-(--color-black)">
                {entry ? clipNickname(entry.nickname) : ""}
              </div>
              <div className="mt-1 text-[14px] leading-none text-(--color-grey)">
                {entry ? `${entry.score}점` : ""}
              </div>
            </div>

            <div
              data-testid="podium-slot"
              className={`flex items-end justify-center text-[14px] font-semibold ${RANK_COLOR_CLASS[rank]}`}
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
