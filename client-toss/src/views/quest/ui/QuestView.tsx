import {
  QuestCardSkeleton,
  QuestSection,
  QUEST_SECTIONS,
} from "@/entities/questCard";
import { FUNNEL_EVENTS, trackScreen } from "@/shared/lib";
import { useEffect } from "react";
import { useMyQuests } from "@/entities/questCard";

const QuestView = () => {
  const { dailyQuests, weeklyQuests, isLoading } = useMyQuests();

  useEffect(() => {
    trackScreen(FUNNEL_EVENTS.questView);
  }, []);

  if (isLoading) {
    return <QuestCardSkeleton />;
  }

  return (
    <div className="space-y-6 pb-4">
      <QuestSection quests={dailyQuests} section={QUEST_SECTIONS.daily} />
      <QuestSection quests={weeklyQuests} section={QUEST_SECTIONS.weekly} />
    </div>
  );
};

export default QuestView;
