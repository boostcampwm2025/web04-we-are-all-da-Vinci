import {
  MissionCardSkeleton,
  MissionSection,
  MISSION_SECTIONS,
  TutorialMissionSection,
} from "@/entities/missionCard";
import { useMissionAction } from "@/shared/hooks";
import { FUNNEL_EVENTS, trackScreen } from "@/shared/lib";
import { useEffect } from "react";
import { useMyMissions } from "@/entities/missionCard";
import { BannerAd } from "@/shared/ui/bannerAd";
import { AD_GROUP_IDS } from "@/shared/config";

const MissionView = () => {
  const { dailyMissions, weeklyMissions, tutorialCategories, isLoading } =
    useMyMissions();

  useEffect(() => {
    trackScreen(FUNNEL_EVENTS.missionView);
  }, []);

  useMissionAction("visit_mission_tab");

  if (isLoading) {
    return <MissionCardSkeleton />;
  }

  const allTutorialCompleted =
    tutorialCategories.length > 0 &&
    tutorialCategories.every((cat) => cat.isCompleted);

  return (
    <div
      data-no-safe-area-bottom
      className="space-y-6 pb-[calc(env(safe-area-inset-bottom)+72px)]"
    >
      {!allTutorialCompleted && (
        <TutorialMissionSection
          categories={tutorialCategories}
          defaultOpen={true}
        />
      )}
      <MissionSection
        missions={dailyMissions}
        section={MISSION_SECTIONS.daily}
      />
      <BannerAd adGroupId={AD_GROUP_IDS.BANNER_LIST} />
      <MissionSection
        missions={weeklyMissions}
        section={MISSION_SECTIONS.weekly}
      />
    </div>
  );
};

export default MissionView;
