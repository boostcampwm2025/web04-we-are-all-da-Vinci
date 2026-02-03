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

  // 8명 이하일 때만 잠금 슬롯 표시
  const hasLockedSlots = maxPlayer <= BASE_SLOTS;

  // 8명 초과 시 추가로 표시할 빈자리 개수
  const extraSlotsCount = hasLockedSlots
    ? 0
    : Math.max(0, maxPlayer - BASE_SLOTS - Math.max(0, players.length - BASE_SLOTS));

  const { setHoveredIndex, isHighlighted } = useSlotHighlight({ maxPlayer });
  const { kickModalConfig, openKickModal, closeKickModal } = useKickModal();

  // maxPlayer 값을 서버에 업데이트
  const updateMaxPlayer = (newMaxPlayer: number) => {
    socket.emit(SERVER_EVENTS.ROOM_SETTINGS, {
      roomId,
      maxPlayer: newMaxPlayer,
      totalRounds: settings.totalRounds,
      drawingTime: settings.drawingTime,
    });
  };

  // 잠금 슬롯 해제 (클릭한 슬롯까지 활성화)
  const handleUnlockSlot = (index: number) => {
    if (!isHost) return;
    updateMaxPlayer(index + 1);
  };

  // 빈자리 잠금 (클릭한 슬롯부터 잠금)
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
          'grid min-h-0 flex-1 content-start gap-2 overflow-y-auto grid-cols-4 md:gap-4',
          hasLockedSlots ? 'auto-rows-fr' : 'auto-rows-min',
        )}
      >
        {Array.from({ length: BASE_SLOTS }, (_, i) => {
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

          if (hasLockedSlots && i >= maxPlayer) {
            return (
              <SlotCard
                key={`locked-${i}`}
                variant="locked"
                isInteractive={isHost}
                isHighlighted={isHighlighted(i)}
                onClick={() => handleUnlockSlot(i)}
                onMouseEnter={() => isHost && setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          }

          const isLockable = isHost && hasLockedSlots;
          return (
            <SlotCard
              key={`empty-${i}`}
              variant="empty"
              isInteractive={isLockable}
              isHighlighted={isHighlighted(i)}
              onClick={() => handleLockSlot(i)}
              onMouseEnter={() => isLockable && setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}

        {extraSlotsCount > 0 &&
          Array.from({ length: extraSlotsCount }).map((_, i) => (
            <SlotCard key={`extra-${i}`} variant="empty" />
          ))}
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
