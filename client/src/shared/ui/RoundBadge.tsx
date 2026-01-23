interface RoundBadgeProps {
  round: number;
}

const RoundBadge = ({ round }: RoundBadgeProps) => {
  return (
    <div className="mb-2 inline-block rounded-full bg-indigo-600 px-4 py-1 text-sm font-bold text-white">
      ROUND {round}
    </div>
  );
};

export default RoundBadge;
