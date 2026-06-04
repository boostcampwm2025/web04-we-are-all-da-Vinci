import type { TutorialCategory } from "@toss/shared";
import { ListHeader } from "@toss/tds-mobile";
import { useState } from "react";
import { REWARD_LABEL } from "../config/constants";
import QuestCard from "./QuestCard";

interface TutorialCategorySectionProps {
  category: TutorialCategory;
}

const TutorialCategorySection = ({
  category,
}: TutorialCategorySectionProps) => {
  const [isOpen, setIsOpen] = useState(!category.isCompleted);
  const rewardLabel = `${category.rewardAmount}${REWARD_LABEL.point}`;

  return (
    <section>
      <button
        type="button"
        className="w-full"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <ListHeader
          title={
            <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
              <span className="mr-2 inline-block h-5 w-1 rounded-full bg-(--color-toss-blue) align-middle" />
              {category.label}
            </ListHeader.TitleParagraph>
          }
          right={
            category.isCompleted ? (
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
            )
          }
        />
      </button>
      {isOpen && (
        <div className="flex flex-col gap-3 px-(--page-px)">
          {category.quests.map((quest) => (
            <QuestCard key={quest.userQuestId} quest={quest} />
          ))}
        </div>
      )}
    </section>
  );
};

export default TutorialCategorySection;
