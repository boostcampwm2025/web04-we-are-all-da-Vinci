import type { TutorialCategory } from "@toss/shared";
import { ListHeader } from "@toss/tds-mobile";
import { useState } from "react";
import TutorialCategoryCard from "./TutorialCategoryCard";

interface TutorialQuestSectionProps {
  categories: TutorialCategory[];
  defaultOpen?: boolean;
}

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
  >
    <path
      d="M5 7.5L10 12.5L15 7.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TutorialQuestSection = ({
  categories,
  defaultOpen = true,
}: TutorialQuestSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (categories.length === 0) return null;

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
              튜토리얼 퀘스트
            </ListHeader.TitleParagraph>
          }
          right={
            <span className="pr-(--page-px) text-(--color-grey)">
              <ChevronIcon isOpen={isOpen} />
            </span>
          }
        />
      </button>
      {isOpen && (
        <div className="flex flex-col gap-4 px-(--page-px)">
          {categories.map((cat) => (
            <TutorialCategoryCard key={cat.category} category={cat} />
          ))}
        </div>
      )}
    </section>
  );
};

export default TutorialQuestSection;
