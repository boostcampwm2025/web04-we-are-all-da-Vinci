import { ReactNode } from 'react';
import { PlayerCard, EmptySlot } from '@/entities/player';

interface Player {
  id: number;
  nickname: string;
  status: string;
  isHost: boolean;
}

interface PlayerListSectionProps {
  players: Player[];
  maxPlayers: number;
  roomCode?: ReactNode;
}

export function PlayerListSection({
  players,
  maxPlayers,
  roomCode,
}: PlayerListSectionProps) {
  const emptySlots = Math.max(0, maxPlayers - players.length);

  return (
    <div className="flex flex-col rounded-2xl border-2 border-gray-800 bg-white p-6 shadow-lg">
      <div className="mb-5 flex shrink-0 items-center justify-between">
        <h2 className="font-handwriting flex items-center gap-2 text-2xl font-bold">
          인원
          <span className="text-lg text-gray-500">
            ({players.length}/{maxPlayers})
          </span>
        </h2>
        {roomCode}
      </div>

      <div className="grid max-h-80 grid-cols-4 gap-5 overflow-y-scroll">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            id={player.id}
            nickname={player.nickname}
            isHost={player.isHost}
            status={player.status}
          />
        ))}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} />
        ))}
      </div>
    </div>
  );
}
