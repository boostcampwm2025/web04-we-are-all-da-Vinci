import type { PodiumResponse } from "@/entities/podium";
import { brainImg, painterMan2Img } from "@/shared/assets/images";
import { ShareSheet } from "@/feature/share";
import { Button } from "@toss/tds-mobile";
import { memo, type ReactNode, useState } from "react";

interface StatPillProps {
  icon: ReactNode;
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
  cta: ReactNode;
  podium?: PodiumResponse["podium"];
  participantCount?: number;
  // 친구 초대 적립 성공 시 호출 — 오늘의 미션 진행도를 재조회한다.
  onInvited?: () => void;
}

const ChallengeCard = ({
  cta,
  podium,
  participantCount,
  onInvited,
}: ChallengeCardProps) => {
  const [shareOpen, setShareOpen] = useState(false);
  const topScore = podium && podium.length > 0 ? `${podium[0].score}점` : "-";
  const participantText =
    participantCount == null
      ? "-"
      : `${participantCount.toLocaleString("ko-KR")}명`;

  return (
    <section className="rounded-(--radius-card) bg-(--color-card-yellow) p-5">
      <div className="flex items-stretch justify-between gap-3">
        <div className="flex flex-col gap-4">
          <h2 className="text-[22px] leading-tight font-bold whitespace-nowrap text-(--color-black)">
            <span className="text-(--color-bronze)">10초</span> 동안{" "}
            <span className="text-2xl text-(--color-bronze)">기억</span>하고
            <br />
            <span className="text-(--color-bronze)">30초</span> 동안{" "}
            <span className="text-2xl text-(--color-bronze)">그려요</span>
          </h2>
          <div className="flex flex-col items-start gap-2">
            <StatPill
              icon={
                <img
                  src={painterMan2Img}
                  alt=""
                  className="h-6 w-6 object-contain"
                />
              }
              label="오늘 참가자"
              value={participantText}
            />
            <StatPill
              icon={
                <img src={brainImg} alt="" className="h-6 w-6 object-contain" />
              }
              label="오늘 최고점"
              value={topScore}
            />
          </div>
        </div>

        <div className="flex w-28 min-w-0 shrink items-center justify-center rounded-(--radius-inner) bg-(--color-card)">
          <span
            aria-hidden
            className="flex aspect-square w-[71%] items-center justify-center rounded-full bg-(--color-gold) text-4xl font-bold text-white"
          >
            ?
          </span>
        </div>
      </div>

      <div className="mt-5">{cta}</div>
      <div className="mt-2">
        <Button
          display="block"
          variant="weak"
          onClick={() => setShareOpen(true)}
        >
          친구 초대하고 기회 받기
        </Button>
      </div>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onInvited={onInvited}
      />
    </section>
  );
};

export default memo(ChallengeCard);
