import {
  ATTENDANCE_CYCLE_LENGTH,
  ATTENDANCE_REWARD_DAYS,
  ATTENDANCE_REWARD_POINT,
} from "@toss/shared";

interface AttendanceProgressProps {
  cycleDay: number;
  recoverableDay?: number | null;
}

const REWARD_DAY_SET = new Set<number>(ATTENDANCE_REWARD_DAYS);
const DAYS = Array.from({ length: ATTENDANCE_CYCLE_LENGTH }, (_, i) => i + 1);

// 7일 사이클 진행을 동그라미로 보여주는 공용 컴포넌트. 끊김 시트·미션 탭 상단이 공유한다.
const AttendanceProgress = ({
  cycleDay,
  recoverableDay = null,
}: AttendanceProgressProps) => {
  // 끊김 상태면 직전 연속(recoverableDay)까지를 채우고 그 다음 칸을 ✕로 표시한다.
  const filledUpTo = recoverableDay ?? cycleDay;
  const breakAt = recoverableDay != null ? recoverableDay + 1 : null;

  return (
    <ol className="flex items-center justify-between gap-1">
      {DAYS.map((day) => {
        const isFilled = day <= filledUpTo;
        const isBreak = day === breakAt;
        const isReward = REWARD_DAY_SET.has(day);

        const label = isBreak
          ? "✕"
          : isReward
            ? `${ATTENDANCE_REWARD_POINT}원`
            : String(day);

        let tone: string;
        if (isFilled) {
          tone = "bg-(--color-toss-blue) text-white";
        } else if (isBreak) {
          // 끊긴 연속(✕)은 부정 상태 → 채워진 동그라미를 토스 시그니처 레드(coral)로.
          tone = "bg-(--color-coral) text-white";
        } else if (isReward) {
          tone =
            "border border-dashed border-(--color-toss-blue) text-(--color-toss-blue)";
        } else {
          tone = "bg-(--color-card) text-(--color-grey)";
        }

        return (
          <li
            key={day}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${tone}`}
          >
            {label}
          </li>
        );
      })}
    </ol>
  );
};

export default AttendanceProgress;
