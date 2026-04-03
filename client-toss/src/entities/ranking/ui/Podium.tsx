export const Podium = () => {
  const rankings = [
    { rank: 2, name: "긴긴이름...", score: "80.01점", width: 75, height: 50 },
    { rank: 1, name: "김동권", score: "99.54점", width: 75, height: 80 },
    { rank: 3, name: "조천산", score: "58.8점", width: 75, height: 30 },
  ];
  return (
    <div
      className="flex flex-col justify-end w-full rounded-[8px] bg-[#F9FAFB] px-4"
      style={{ height: 205 }}
    >
      <div className="flex items-end justify-center gap-2 pb-16">
        {rankings.map((player) => (
          <div
            key={player.rank}
            className="flex flex-col items-center justify-end gap-2"
          >
            <div className="flex flex-col mb-3 text-center gap-1">
              <div className="w-[75px] truncate text-[16px] font-bold leading-tight text-black">
                {player.name}
              </div>
              <div className="mt-1 text-[14px] leading-none text-[#8f97a3]">
                {player.score}
              </div>
            </div>

            <div
              className="flex items-end justify-center bg-[#E5E8EB] text-[14px] font-semibold text-white"
              style={{
                width: player.width,
                height: player.height,
              }}
            >
              {player.rank}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
