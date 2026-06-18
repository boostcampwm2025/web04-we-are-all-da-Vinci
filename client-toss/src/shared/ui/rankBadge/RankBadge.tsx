const PODIUM_BADGE_CLASS: Record<number, string> = {
  1: "bg-(--color-gold) text-white",
  2: "bg-(--color-silver) text-white",
  3: "bg-(--color-bronze) text-white",
};
const DEFAULT_BADGE_CLASS = "bg-(--color-card) text-(--color-description)";

interface RankBadgeProps {
  rank: number;
  className?: string;
}

const RankBadge = ({ rank, className = "" }: RankBadgeProps) => (
  <span
    className={`inline-flex items-center justify-center rounded-full font-bold ${
      PODIUM_BADGE_CLASS[rank] ?? DEFAULT_BADGE_CLASS
    } ${className}`}
  >
    {rank}
  </span>
);

export default RankBadge;
