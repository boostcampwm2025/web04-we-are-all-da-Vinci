import { Injectable } from '@nestjs/common';
import { Player, Room } from './game-play.types';

@Injectable()
export class GamePlayService {
  private rooms = new Map<string, Room>();
  private socketToRoom = new Map<string, string>();

  private resetTimers = new Map<string, NodeJS.Timeout>();

  getRoom(roomId: string) {
    return this.rooms.get(roomId) ?? null;
  }

  getPlayers(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.players.values());
  }

  join(roomId: string, socketId: string, userId: string) {
    this.socketToRoom.set(socketId, roomId);

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        roomId,
        players: new Map(),
        submitCount: 0,
        state: 'WAITING',
      });
    }

    const room = this.rooms.get(roomId);
    const isFirst = room?.players.size === 0;
    room?.players?.set(socketId, {
      id: socketId,
      userId,
      score: 0,
      drawing: [[]],
      isHost: isFirst,
    });

    return roomId;
  }

  leave(socketId: string) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) {
      this.socketToRoom.delete(socketId);
      return roomId;
    }

    const leaving = room.players.get(socketId);
    room.players.delete(socketId);

    if (room.players.size === 0) {
      // 타이머 정리
      const t = this.resetTimers.get(roomId);
      if (t) clearTimeout(t);
      this.resetTimers.delete(roomId);

      this.rooms.delete(roomId);
      this.socketToRoom.delete(socketId);
      return roomId;
    }

    if (leaving?.isHost) {
      const next = room.players.values().next().value as Player | undefined;
      if (next) {
        next.isHost = true;
        room.players.set(next.id, next);
      }
    }

    this.socketToRoom.delete(socketId);
    return roomId;
  }

  startGame(roomId: string, socketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false as const, message: 'Room not found.' };

    const p = room.players.get(socketId);
    if (!p) return { ok: false as const, message: 'You are not in this room.' };

    if (!p.isHost) {
      return { ok: false as const, message: 'Only host can start the game.' };
    }

    if (room.state !== 'WAITING') {
      return {
        ok: false as const,
        message: `Game is not startable. state=${room.state}`,
      };
    }

    room.state = 'PLAYING'; // ✅ 게임 시작 상태 전환
    return { ok: true as const };
  }

  endRound(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false as const, message: 'Room not found.' };

    room.state = 'ENDED';
    return { ok: true as const };
  }

  // ✅ 10초 후 WAITING 복귀 스케줄 (중복 방지)
  scheduleResetToWaiting(roomId: string, delayMs = 10_000) {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false as const, message: 'Room not found.' };

    // 기존 타이머가 있으면 취소(중복 스케줄 방지)
    const prev = this.resetTimers.get(roomId);
    if (prev) {
      clearTimeout(prev);
      this.resetTimers.delete(roomId);
    }

    const t = setTimeout(() => {
      const r = this.rooms.get(roomId);
      if (!r) return; // 방이 이미 삭제된 경우

      // 상태가 이미 다른 상태로 바뀌었으면(예: 강제 재시작/다음 라운드 시작) 리셋하지 않음
      if (r.state !== 'ENDED') return;

      // WAITING으로 복귀 + 라운드 관련 상태 초기화
      r.state = 'WAITING';
      r.submitCount = 0;

      for (const p of r.players.values()) {
        p.drawing = [];
        // score를 라운드 누적이 아닌 "라운드 점수"로 쓰면 0으로 초기화하세요.
        // p.score = 0;
        r.players.set(p.id, p);
      }

      this.resetTimers.delete(roomId);
    }, delayMs);

    this.resetTimers.set(roomId, t);
    return { ok: true as const };
  }

  updateScore(roomId: string, socketId: string, score: number) {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false as const, message: 'Room not found.' };

    const p = room.players.get(socketId);
    if (!p) return { ok: false as const, message: 'You are not in this room.' };

    p.score = score;
    room.players.set(socketId, p);
    return { ok: true as const };
  }

  submitDrawingResult(
    roomId: string,
    socketId: string,
    score: number,
    drawing: number[][],
  ) {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false as const, message: 'Room not found.' };

    const p = room.players.get(socketId);
    if (!p) return { ok: false as const, message: 'You are not in this room.' };

    p.score = score;
    p.drawing = drawing;

    room.players.set(socketId, p);

    room.submitCount += 1;

    return { roundEnd: room.players.size === room.submitCount };
  }
}
