import { useGameStore } from '@/entities/gameRoom';
import { EmptySlot, PlayerCard } from '@/entities/player';
import type { Player } from '@/entities/player/model';
import { getSocket } from '@/shared/api/socket';
import { SERVER_EVENTS } from '@/shared/config';
import { OverlayModal } from '@/shared/ui';
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
  const emptySlots = maxPlayer - players.length;
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
    <div className="card flex h-[350px] flex-col p-6 md:h-full">
      <div className="mb-5 flex shrink-0 items-center justify-between">
        <h2 className="font-handwriting flex items-center gap-2 text-lg font-bold md:text-2xl">
          인원
          <span className="text-content-tertiary text-base md:text-xl">
            ({players.length}/{maxPlayer})
          </span>
        </h2>
        {roomCode}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-3 content-start gap-2 overflow-y-auto md:grid-cols-4 md:gap-4">
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

      <OverlayModal
        isOpen={kickModalConfig.isOpen}
        onClose={() => setKickModalConfig({ isOpen: false })}
        title={`${kickModalConfig.targetPlayerNickname}님을 퇴장시키겠습니까?`}
        onConfirm={kickModalConfig.onConfirm ?? (() => {})}
        confirmText="퇴장"
        onCancel={() => setKickModalConfig({ isOpen: false })}
        cancelText="취소"
      />
    </div>
  );
};
