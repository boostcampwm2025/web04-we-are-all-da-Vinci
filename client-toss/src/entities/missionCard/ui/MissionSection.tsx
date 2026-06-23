import type { MissionItem } from "@toss/shared";
import { ListHeader } from "@toss/tds-mobile";
import type { MissionSectionConfig } from "../config/constants";
import MissionCard from "./MissionCard";

interface MissionSectionProps {
  missions: MissionItem[];
  section: MissionSectionConfig;
  // 미션 진행 기간(예: "6월 16일 ~ 6월 22일"). 헤더 우측에 노출한다.
  rangeLabel?: string;
}

const MissionSection = ({
  missions,
  section,
  rangeLabel,
}: MissionSectionProps) => {
  if (missions.length === 0) return null;

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
        right={
          rangeLabel ? (
            <span className="shrink-0 pr-(--page-px) text-[13px] whitespace-nowrap text-(--color-grey)">
              {rangeLabel}
            </span>
          ) : undefined
        }
      />
      <div className="mt-2 flex flex-col gap-3 px-(--page-px)">
        {missions.map((mission) => (
          <MissionCard key={mission.userMissionId} mission={mission} />
        ))}
      </div>
    </section>
  );
};

export default MissionSection;
