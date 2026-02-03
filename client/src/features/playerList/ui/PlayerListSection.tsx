import { useGameStore, useIsHost } from '@/entities/gameRoom';
import { PlayerCard, SlotCard } from '@/entities/player';
import type { Player } from '@/entities/player/model';
import { getSocket } from '@/shared/api/socket';
import { SERVER_EVENTS } from '@/shared/config';
import { cn } from '@/shared/lib/classNames';
import { OverlayModal } from '@/shared/ui';
import type { ReactNode } from 'react';
import { useKickModal } from '../model/useKickModal';
import { useSlotHighlight } from '../model/useSlotHighlight';

interface PlayerListSectionProps {
  players: Player[];
  maxPlayer: number;
  roomCode?: ReactNode;
}

const BASE_SLOTS = 8;

export const PlayerListSection = ({
  players,
  maxPlayer,
  roomCode,
}: PlayerListSectionProps) => {
  const socket = getSocket();
  const roomId = useGameStore((state) => state.roomId);
  const settings = useGameStore((state) => state.settings);
  const isHost = useIsHost();

  // 표시할 총 슬롯 개수 (최소 8개, maxPlayer만큼)
  const totalSlots = Math.max(BASE_SLOTS, maxPlayer);

  // 8명 이하일 때만 잠금/해제 기능 활성화
  const canAdjustSlots = maxPlayer <= BASE_SLOTS;

  const { setHoveredIndex, isHighlighted } = useSlotHighlight({ maxPlayer });
  const { kickModalConfig, openKickModal, closeKickModal } = useKickModal();

  const updateMaxPlayer = (newMaxPlayer: number) => {
    socket.emit(SERVER_EVENTS.ROOM_SETTINGS, {
      roomId,
      maxPlayer: newMaxPlayer,
      totalRounds: settings.totalRounds,
      drawingTime: settings.drawingTime,
    });
  };

  const handleUnlockSlot = (index: number) => {
    if (!isHost) return;
    updateMaxPlayer(index + 1);
  };

  const handleLockSlot = (index: number) => {
    if (!isHost || index < players.length) return;
    updateMaxPlayer(index);
  };

  return (
    <div className="card flex h-87.5 flex-col p-6 md:h-full">
      <div className="mb-5 flex shrink-0 items-center justify-between">
        <h2 className="font-handwriting flex items-center gap-2 text-lg font-bold md:text-2xl">
          인원
          <span className="text-content-tertiary text-base md:text-xl">
            ({players.length}/{maxPlayer})
          </span>
        </h2>
        {roomCode}
      </div>

      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-4 content-start gap-2 overflow-y-auto md:gap-4',
          totalSlots <= BASE_SLOTS ? 'auto-rows-fr' : 'auto-rows-min',
        )}
      >
        {Array.from({ length: totalSlots }, (_, i) => {
          const player = players[i];

          if (player) {
            return (
              <PlayerCard
                key={player.socketId}
                id={player.socketId}
                nickname={player.nickname}
                profileId={player.profileId}
                isHost={player.isHost ?? false}
                status="대기중"
                onKickClick={() => openKickModal(player)}
              />
            );
          }

          if (i >= maxPlayer) {
            return (
              <SlotCard
                key={`locked-${i}`}
                variant="locked"
                isInteractive={isHost && canAdjustSlots}
                isHighlighted={isHighlighted(i)}
                onClick={() => handleUnlockSlot(i)}
                onMouseEnter={() =>
                  isHost && canAdjustSlots && setHoveredIndex(i)
                }
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          }

          return (
            <SlotCard
              key={`empty-${i}`}
              variant="empty"
              isInteractive={isHost && canAdjustSlots}
              isHighlighted={isHighlighted(i)}
              onClick={() => handleLockSlot(i)}
              onMouseEnter={() =>
                isHost && canAdjustSlots && setHoveredIndex(i)
              }
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}
      </div>

      <OverlayModal
        isOpen={kickModalConfig.isOpen}
        onClose={closeKickModal}
        title={`${kickModalConfig.targetPlayerNickname}님을 퇴장시키겠습니까?`}
        onConfirm={kickModalConfig.onConfirm ?? (() => {})}
        confirmText="퇴장"
        onCancel={closeKickModal}
        cancelText="취소"
      />
    </div>
  );
};
