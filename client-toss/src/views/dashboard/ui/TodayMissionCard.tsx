import { useTodayMissions } from "@/entities/missionCard";
import type { TodayMissionItem } from "@toss/shared";
import { useNavigate } from "react-router-dom";

// 미션을 세로로 한 줄씩 쌓는다 — 좌측 체크+제목(truncate), 우측 보상 pill.
const MissionRow = ({ title, rewardAmount, done }: TodayMissionItem) => (
  <div
    className={`flex items-center justify-between gap-3 rounded-(--radius-inner) p-3 ${
      done ? "bg-(--color-card-blue)" : "bg-(--color-card)"
    }`}
  >
    <div className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? "bg-(--color-toss-blue) text-white"
            : "border border-(--color-silver) text-transparent"
        }`}
      >
        ✓
      </span>
      <span className="truncate text-[13px] font-medium text-(--color-black)">
        {title}
      </span>
    </div>
    {/* 미완 미션은 보상 pill을 채운 파랑으로 강조해 "도전해서 받기"를 유도 */}
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
        done
          ? "bg-(--color-page) text-(--color-toss-blue)"
          : "bg-(--color-toss-blue) text-white"
      }`}
    >
      +{rewardAmount}P
    </span>
  </div>
);

const CardShell = ({ children }: { children: React.ReactNode }) => (
  <section className="rounded-(--radius-card) border border-(--color-card) bg-(--color-page) p-4">
    {children}
  </section>
);

const TodayMissionCard = () => {
  const navigate = useNavigate();
  const { missions, isLoading } = useTodayMissions();

  if (isLoading) {
    return (
      <CardShell>
        <div className="h-5 w-24 animate-pulse rounded-full bg-(--color-card)" />
        <div className="mt-3 flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-(--radius-inner) bg-(--color-card)"
            />
          ))}
        </div>
      </CardShell>
    );
  }

  // 배정된 미션이 없으면 카드 자체를 숨긴다.
  if (missions.length === 0) return null;

  const doneCount = missions.filter((mission) => mission.done).length;

  return (
    <CardShell>
      <div className="flex items-baseline justify-between">
        <button
          type="button"
          onClick={() => navigate("/mission")}
          className="flex w-full items-baseline justify-between"
        >
          <div className="flex items-baseline gap-1.5">
            <h2 className="text-base font-bold text-(--color-black)">
              오늘의 미션
            </h2>
            <span className="rounded-full bg-(--color-card) px-2 py-0.5 text-[11px] font-bold text-(--color-grey)">
              {doneCount}/{missions.length}
            </span>
          </div>
          <span className="text-[13px] font-medium text-(--color-grey)">
            포인트 더 받기 ›
          </span>
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {missions.map((mission) => (
          <MissionRow key={mission.missionId} {...mission} />
        ))}
      </div>
    </CardShell>
  );
};

export default TodayMissionCard;
