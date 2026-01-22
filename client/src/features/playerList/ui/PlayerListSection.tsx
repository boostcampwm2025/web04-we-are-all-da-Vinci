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

interface KickModalConfig {
  isOpen: boolean;
  targetPlayerNickname?: string;
  onConfirm?: () => void;
}

export const PlayerListSection = ({
  players,
  maxPlayer,
  roomCode,
}: PlayerListSectionProps) => {
  const TOTAL_SLOTS = 8;
  const emptySlots = TOTAL_SLOTS - players.length;
  const [kickModalConfig, setKickModalConfig] = useState<KickModalConfig>({
    isOpen: false,
  });
  const socket = getSocket();
  const roomId = useGameStore((state) => state.roomId);

  const handleKick = (player: Player) => {
    setKickModalConfig({
      isOpen: true,
      targetPlayerNickname: player.nickname,
      onConfirm: () => {
        socket.emit(SERVER_EVENTS.USER_KICK, {
          roomId,
          targetPlayerId: player.socketId,
        });
        setKickModalConfig({ isOpen: false });
      },
    });
  };

  return (
    <div className="card flex h-full flex-col p-6">
      <div className="mb-5 flex shrink-0 items-center justify-between">
        <h2 className="font-handwriting flex items-center gap-2 text-2xl font-bold">
          인원
          <span className="text-content-tertiary text-lg">
            ({players.length}/{maxPlayer})
          </span>
        </h2>
        {roomCode}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto sm:gap-4 md:grid-cols-4">
        {players.map((player) => (
          <PlayerCard
            key={player.socketId}
            id={player.socketId}
            nickname={player.nickname}
            profileId={player.profileId}
            isHost={player.isHost ?? false}
            status="대기중"
            onKickClick={() => handleKick(player)}
          />
        ))}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} />
        ))}
      </div>

      {kickModalConfig.isOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border-2 border-gray-400 bg-white p-8 shadow-xl">
            <h2 className="font-handwriting mb-6 text-center text-4xl font-bold">
              {kickModalConfig.targetPlayerNickname}님을 퇴장시키겠습니까?
            </h2>
            <div className="mt-6 flex justify-between gap-4">
              <CommonBtn
                variant="scribble"
                icon="check_circle"
                text="퇴장"
                onClick={kickModalConfig.onConfirm}
              />
              <CommonBtn
                variant="scribble"
                icon="cancel"
                text="취소"
                onClick={() => setKickModalConfig({ isOpen: false })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
