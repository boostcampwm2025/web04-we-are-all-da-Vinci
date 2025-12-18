interface PlayerCardProps {
  player: {
    name: string;
    ready: boolean;
    isHost?: boolean;
  };
}

export default function PlayerCard({ player }: PlayerCardProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 p-4 text-center ${
        player.isHost
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 bg-gray-50'
      }`}
    >
      {player.isHost && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-2 py-1 text-sm font-bold text-yellow-900">
          👑
        </div>
      )}
      <div className="mx-auto mb-2 flex aspect-square w-[40%] shrink-0 items-center justify-center rounded-full bg-gray-200"></div>
      <div className="font-handwriting mb-1 text-lg font-bold">
        {player.name}
      </div>
      <div className="font-handwriting text-sm text-gray-500">
        {player.ready ? '준비 완료!' : '대기중..'}
      </div>
    </div>
  );
}
