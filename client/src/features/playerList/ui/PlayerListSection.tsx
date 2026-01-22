import { EmptySlot, PlayerCard } from '@/entities/player';
import type { Player } from '@/entities/player/model';
import type { ReactNode } from 'react';

interface PlayerListSectionProps {
  players: Player[];
  maxPlayer: number;
  roomCode?: ReactNode;
}

export const PlayerListSection = ({
  players,
  maxPlayer,
  roomCode,
}: PlayerListSectionProps) => {
  const TOTAL_SLOTS = 8;
  const emptySlots = TOTAL_SLOTS - players.length;

  return (
    <div className="card flex h-100 flex-col p-6">
      <div className="mb-5 flex shrink-0 items-center justify-between">
        <h2 className="font-handwriting flex items-center gap-2 text-2xl font-bold">
          인원
          <span className="text-content-tertiary text-lg">
            ({players.length}/{maxPlayer})
          </span>
        </h2>
        {roomCode}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-4 content-start gap-4 overflow-y-auto">
        {players.map((player) => (
          <PlayerCard
            key={player.socketId}
            id={player.socketId}
            nickname={player.nickname}
            isHost={player.isHost ?? false}
            status="대기중"
          />
        ))}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} />
        ))}
      </div>
    </div>
  );
};
