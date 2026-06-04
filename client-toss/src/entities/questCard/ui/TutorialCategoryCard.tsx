import type { TutorialCategory } from "@toss/shared";
import { ProgressBar } from "@toss/tds-mobile";
import { REWARD_LABEL } from "../config/constants";

interface TutorialCategoryCardProps {
  category: TutorialCategory;
}

const TutorialCategoryCard = ({ category }: TutorialCategoryCardProps) => {
  const rewardLabel = `${category.rewardAmount}${REWARD_LABEL.point}`;

  return (
    <div className="space-y-3 rounded-xl bg-(--color-grey)/5 p-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3.5 w-1 rounded-full bg-(--color-grey)/30" />
          <span className="text-[15px] font-semibold text-(--color-grey)">
            {category.label}
          </span>
        </div>
        {category.isCompleted ? (
          <div className="flex items-center gap-1 rounded-full bg-(--color-toss-blue) px-3 py-1.5 text-sm font-bold text-white">
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
          <div className="rounded-full border border-dashed border-(--color-grey) px-3 py-1.5 text-sm font-bold text-(--color-grey)">
            {rewardLabel}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {category.quests.map((quest) => {
          const progress = Math.min(
            quest.currentCount / quest.requiredCount,
            1,
          );
          return (
            <div key={quest.userQuestId} className="card px-4 py-4">
              <p className="text-[15px] font-semibold text-(--color-black)">
                {quest.title}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1">
                  <ProgressBar progress={progress} size="bold" animate />
                </div>
                <span className="shrink-0 text-xs font-medium text-(--color-grey)">
                  ({quest.currentCount}/{quest.requiredCount})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TutorialCategoryCard;
