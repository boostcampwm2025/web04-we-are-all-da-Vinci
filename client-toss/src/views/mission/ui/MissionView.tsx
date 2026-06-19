import {
  AttendanceProgress,
  AttendanceSummary,
  useAttendanceStatus,
} from "@/entities/attendance";
import {
  getDailyMissionRangeLabel,
  getWeeklyMissionRangeLabel,
  MissionCardSkeleton,
  MissionSection,
  MISSION_SECTIONS,
  TutorialMissionSection,
  useMyMissions,
} from "@/entities/missionCard";
import { useMissionAction } from "@/shared/hooks";
import { FUNNEL_EVENTS, trackScreen } from "@/shared/lib";
import { AD_GROUP_IDS } from "@/shared/config";
import { BannerAd } from "@/shared/ui/bannerAd";
import { ATTENDANCE_REWARD_DAYS, ATTENDANCE_REWARD_POINT } from "@toss/shared";
import { useEffect } from "react";

const MissionView = () => {
  const { dailyMissions, weeklyMissions, tutorialCategories, isLoading } =
    useMyMissions();
  const { status: attendanceStatus } = useAttendanceStatus();

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

  const missionMaxPoint = dailyMissions
    .filter((mission) => mission.rewardType === "point")
    .reduce((sum, mission) => sum + mission.rewardAmount, 0);

  return (
    <div
      data-no-safe-area-bottom
      className="min-h-0 flex-1 overflow-y-auto bg-(--color-page) pb-[calc(env(safe-area-inset-bottom)+72px)]"
    >
      <div className="flex flex-col gap-1 pt-3">
        {attendanceStatus && (
          <section className="mx-(--page-px) rounded-(--radius-card) bg-(--color-card-blue) p-5">
            <AttendanceSummary
              status={attendanceStatus}
              missionMaxPoint={missionMaxPoint}
            />
            <div className="mt-4">
              <AttendanceProgress
                cycleDay={attendanceStatus.cycleDay}
                recoverableDay={
                  attendanceStatus.recoverable
                    ? attendanceStatus.previousDay
                    : null
                }
              />
            </div>
            <p className="mt-3 text-[13px] text-(--color-grey)">
              {ATTENDANCE_REWARD_DAYS.map((day) => `${day}일`).join("·")} 연속
              출석하면{" "}
              <span className="font-bold text-(--color-toss-blue)">
                {ATTENDANCE_REWARD_POINT}원
              </span>
              을 추가로 받아요
            </p>
          </section>
        )}

        {!allTutorialCompleted && (
          <TutorialMissionSection
            categories={tutorialCategories}
            defaultOpen={true}
          />
        )}
        <MissionSection
          missions={dailyMissions}
          section={MISSION_SECTIONS.daily}
          rangeLabel={getDailyMissionRangeLabel()}
        />
      </div>
      <div className="mt-1 px-(--card-mx)">
        <BannerAd type="feed" adGroupId={AD_GROUP_IDS.BANNER_FEED} />
      </div>
      {weeklyMissions.length > 0 && (
        <MissionSection
          missions={weeklyMissions}
          section={MISSION_SECTIONS.weekly}
          rangeLabel={getWeeklyMissionRangeLabel()}
        />
      )}
    </div>
  );
};

export default MissionView;
