import type { MissionItem } from "@toss/shared";
import { ListHeader } from "@toss/tds-mobile";
import type { MissionSectionConfig } from "../config/constants";
import MissionCard from "./MissionCard";

interface MissionSectionProps {
  missions: MissionItem[];
  section: MissionSectionConfig;
}

const MissionSection = ({ missions, section }: MissionSectionProps) => {
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
      />
      <div className="flex flex-col gap-3 px-(--page-px)">
        {missions.map((mission) => (
          <MissionCard key={mission.userMissionId} mission={mission} />
        ))}
      </div>
    </section>
  );
};

export default MissionSection;
