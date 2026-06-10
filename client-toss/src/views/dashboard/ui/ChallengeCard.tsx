import { usePodium } from "@/entities/podium";
import type { ReactNode } from "react";

interface StatPillProps {
  icon: string;
  label: string;
  value: string;
}

const StatPill = ({ icon, label, value }: StatPillProps) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-(--color-chip-yellow) px-3 py-1.5 text-[13px] text-(--color-black)">
    <span aria-hidden className="leading-none">
      {icon}
    </span>
    <span className="text-(--color-grey)">{label}</span>
    <span className="font-bold">{value}</span>
  </span>
);

interface ChallengeCardProps {
  /** 하단 도전 버튼 — DashboardView가 게임시작/광고 로직을 담아 전달 */
  cta: ReactNode;
}

const ChallengeCard = ({ cta }: ChallengeCardProps) => {
  const { podium, participantCount } = usePodium();
  const topScore = podium && podium.length > 0 ? `${podium[0].score}점` : "-";
  const participantText =
    participantCount == null
      ? "-"
      : `${participantCount.toLocaleString("ko-KR")}명`;

  return (
    <section className="rounded-(--radius-card) bg-(--color-card-yellow) p-5">
      <div className="flex items-stretch justify-between gap-3">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl leading-snug font-bold whitespace-nowrap text-(--color-black)">
            10초 동안 기억하고
            <br />
            30초 동안 그려요
          </h2>
          <div className="flex flex-col items-start gap-2">
            <StatPill icon="👥" label="오늘 참가자" value={participantText} />
            <StatPill icon="🔥" label="오늘 최고점" value={topScore} />
          </div>
        </div>
        {/* 오늘의 그림은 도전 전까지 가려져 있어 ? placeholder로 표시.
            박스 높이는 왼쪽(제목+칩) 컬럼 높이에 맞춰 stretch된다. */}
        <div className="flex w-28 shrink-0 items-center justify-center rounded-(--radius-inner) bg-(--color-card)">
          <span
            aria-hidden
            className="flex h-20 w-20 items-center justify-center rounded-full bg-(--color-gold) text-4xl font-bold text-white"
          >
            ?
          </span>
        </div>
      </div>

      <div className="mt-5">{cta}</div>
    </section>
  );
};

export default ChallengeCard;
