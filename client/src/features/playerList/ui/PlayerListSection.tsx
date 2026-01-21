import { useGameStore } from '@/entities/gameRoom/model';
import { EmptySlot, PlayerCard } from '@/entities/player';
import type { Player } from '@/entities/player/model';
import { getSocket } from '@/shared/api/socket';
import { SERVER_EVENTS } from '@/shared/config';
import { CommonBtn } from '@/shared/ui';
import { useState, type ReactNode } from 'react';

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
  const [targetPlayer, setTargetPlayer] = useState<Player | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const socket = getSocket();
  const roomId = useGameStore((state) => state.roomId);

  const handleKick = (player: Player) => {
    setTargetPlayer(player);
    setIsOpen(true);
  };

  const handleConfirmKick = () => {
    socket.emit(SERVER_EVENTS.USER_KICK, {
      roomId,
      targetPlayerId: targetPlayer?.socketId,
    });
    setTargetPlayer(null);
    setIsOpen(false);
  };

  return (
    <div className="card flex h-140 flex-col p-6">
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
            onKickClick={() => handleKick(player)}
          />
        ))}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} />
        ))}
      </div>

      {isOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border-2 border-gray-400 bg-white p-8 shadow-xl">
            <h2 className="font-handwriting mb-6 text-center text-4xl font-bold">
              {targetPlayer?.nickname}님을 퇴장시키겠습니까?
            </h2>
            <div className="mt-6 flex justify-between gap-4">
              <CommonBtn
                variant="scribble"
                icon="check_circle"
                text="퇴장"
                onClick={handleConfirmKick}
              />
              <CommonBtn
                variant="scribble"
                icon="cancel"
                text="취소"
                onClick={() => setIsOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
