import {
  QuestCardSkeleton,
  QuestSection,
  QUEST_SECTIONS,
  TutorialCategorySection,
} from "@/entities/questCard";
import { useQuestAction } from "@/shared/hooks/useQuestAction";
import { FUNNEL_EVENTS, trackScreen } from "@/shared/lib";
import { useEffect } from "react";
import { useMyQuests } from "@/entities/questCard";
import { BannerAd } from "@/shared/ui/bannerAd";
import { AD_GROUP_IDS } from "@/shared/config";

const QuestView = () => {
  const { dailyQuests, weeklyQuests, tutorialCategories, isLoading } =
    useMyQuests();

  useEffect(() => {
    trackScreen(FUNNEL_EVENTS.questView);
  }, []);

  useQuestAction("visit_quest_tab");

  if (isLoading) {
    return <QuestCardSkeleton />;
  }

  const allTutorialCompleted =
    tutorialCategories.length > 0 &&
    tutorialCategories.every((cat) => cat.isCompleted);

  const tutorialSection = tutorialCategories.map((cat) => (
    <TutorialCategorySection key={cat.category} category={cat} />
  ));

  return (
    <div className="space-y-6 pb-4">
      {!allTutorialCompleted && tutorialSection}
      <QuestSection quests={dailyQuests} section={QUEST_SECTIONS.daily} />
      <BannerAd adGroupId={AD_GROUP_IDS.BANNER_LIST} />
      <QuestSection quests={weeklyQuests} section={QUEST_SECTIONS.weekly} />
      {allTutorialCompleted && tutorialSection}
    </div>
  );
};

export default QuestView;
