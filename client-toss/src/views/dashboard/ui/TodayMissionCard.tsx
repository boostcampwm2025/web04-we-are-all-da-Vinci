import { TODAY_MISSIONS, type TodayMission } from "../config/dashboardMock";

const MissionTile = ({ label, point, done }: TodayMission) => (
  <div
    className={`flex flex-1 flex-col gap-3 rounded-(--radius-inner) p-3 ${
      done ? "bg-(--color-card-blue)" : "bg-(--color-card)"
    }`}
  >
    <div className="flex items-start gap-2">
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? "bg-(--color-toss-blue) text-white"
            : "border border-(--color-silver) text-transparent"
        }`}
      >
        ✓
      </span>
      <span className="text-[13px] leading-snug font-medium text-(--color-black)">
        {label}
      </span>
    </div>
    <span className="self-start rounded-full bg-(--color-page) px-2 py-0.5 text-xs font-bold text-(--color-toss-blue)">
      +{point}P
    </span>
  </div>
);

const TodayMissionCard = () => (
  <section className="rounded-(--radius-card) border border-(--color-card) bg-(--color-page) p-4">
    <div className="flex items-center justify-between">
      <h2 className="text-base font-bold text-(--color-black)">오늘의 미션</h2>
      {/* 포인트 더 받기: 진입 라우트가 아직 없어 비활성 라벨로만 노출 (스왑 시 연결) */}
      <span className="text-[13px] font-medium text-(--color-grey)">
        포인트 더 받기 ›
      </span>
    </div>
    <div className="mt-3 flex gap-2">
      {TODAY_MISSIONS.map((mission) => (
        <MissionTile key={mission.id} {...mission} />
      ))}
    </div>
  </section>
);

export default TodayMissionCard;
