import type { QuestItem } from "@toss/shared";
import { ListHeader } from "@toss/tds-mobile";
import type { QuestSectionConfig } from "../config/constants";
import QuestCard from "./QuestCard";

interface QuestSectionProps {
  quests: QuestItem[];
  section: QuestSectionConfig;
}

const QuestSection = ({ quests, section }: QuestSectionProps) => {
  if (quests.length === 0) return null;

  return (
    <section>
      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
            <span
              className="mr-2 inline-block h-5 w-1 rounded-full align-middle"
              style={{ backgroundColor: section.accentColor }}
            />
            {section.label}
          </ListHeader.TitleParagraph>
        }
      />
      <div className="flex flex-col gap-3 px-(--page-px)">
        {quests.map((quest) => (
          <QuestCard key={quest.userQuestId} quest={quest} />
        ))}
      </div>
    </section>
  );
};

export default QuestSection;
