import type { MissionItem } from "@toss/shared";
import { ProgressBar } from "@toss/tds-mobile";
import { REWARD_LABEL } from "../config/constants";

interface MissionCardProps {
  mission: MissionItem;
}

const MissionCard = ({ mission }: MissionCardProps) => {
  const isCompleted = mission.currentCount >= mission.requiredCount;
  const progress = Math.min(mission.currentCount / mission.requiredCount, 1);
  const rewardLabel = `${mission.rewardAmount}${REWARD_LABEL[mission.rewardType] ?? ""}`;

  return (
    <div className="card flex items-center gap-4 px-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-(--color-black)">
          {mission.title}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1">
            <ProgressBar progress={progress} size="bold" animate />
          </div>
          <span className="shrink-0 text-xs font-medium text-(--color-grey)">
            ({mission.currentCount}/{mission.requiredCount})
          </span>
        </div>
      </div>

      {isCompleted ? (
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-(--color-toss-blue) px-3 py-1.5 text-sm font-bold text-white">
          <span>{rewardLabel}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M13.3 4.3a1 1 0 0 1 0 1.4l-5.5 5.5a1 1 0 0 1-1.4 0L3.7 8.5a1 1 0 1 1 1.4-1.4L7 9l4.9-4.7a1 1 0 0 1 1.4 0Z"
              fill="currentColor"
            />
          </svg>
        </div>
      ) : (
        <div className="shrink-0 rounded-full border border-dashed border-(--color-grey) px-3 py-1.5 text-sm font-bold text-(--color-grey)">
          {rewardLabel}
        </div>
      )}
    </div>
  );
};

export default MissionCard;
