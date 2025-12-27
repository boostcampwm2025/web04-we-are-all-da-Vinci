interface RankingCardProps {
  icon: string;
  username: string;
}

const RankingCard = ({ icon, username }: RankingCardProps) => {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
          <span className="material-symbols-outlined text-sm text-white">
            {icon}
          </span>
        </div>
        <span className="font-handwriting text-sm font-bold">{username}</span>
      </div>
      <span className="text-lg font-bold text-blue-600">82%</span>
    </div>
  );
};

export default RankingCard;
