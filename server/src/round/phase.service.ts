import { Injectable } from '@nestjs/common';
import {
  ClientEvents,
  GAME_END_TIME,
  GamePhase,
  PROMPT_TIME,
  ROUND_REPLAY_TIME,
  ROUND_STANDING_TIME,
} from 'src/common/constants';
import { GameRoom } from 'src/common/types';
import { createPlayerMapper } from 'src/common/utils/player.utils';
import { PromptService } from 'src/prompt/prompt.service';
import { GameProgressCacheService } from 'src/redis/cache/game-progress-cache.service';
import { GameRoomCacheService } from 'src/redis/cache/game-room-cache.service';
import { LeaderboardCacheService } from 'src/redis/cache/leaderboard-cache.service';
import { StandingsCacheService } from 'src/redis/cache/standings-cache.service';

interface PhaseEvent {
  event: string;
  payload: unknown;
}

export interface PhaseResult {
  timeLeft: number;

  events: PhaseEvent[];
}

@Injectable()
export class PhaseService {
  constructor(
    private readonly promptService: PromptService,
    private readonly cacheService: GameRoomCacheService,
    private readonly progressCacheService: GameProgressCacheService,
    private readonly standingsCacheService: StandingsCacheService,
    private readonly leaderboardCacheService: LeaderboardCacheService,
  ) {}

  async waiting(room: GameRoom) {
    await this.promptService.resetPromptIds(
      room.roomId,
      room.settings.totalRounds,
    );

    room.phase = GamePhase.WAITING;
    room.currentRound = 0;

    await this.cacheService.saveRoom(room.roomId, room);

    await this.progressCacheService.deleteAll(room.roomId);
    await this.standingsCacheService.deleteAll(room.roomId);
    await this.leaderboardCacheService.deleteAll(room.roomId);
  }

  async prompt(room: GameRoom) {
    room.phase = GamePhase.PROMPT;
    room.currentRound += 1;

    const promptStrokes = await this.promptService.getPromptForRound(
      room.roomId,
      room.currentRound,
    );
    if (!promptStrokes) {
      throw new Error('제시 그림 불러오기에 실패했습니다.');
    }

    await this.cacheService.saveRoom(room.roomId, room);

    return {
      timeLeft: PROMPT_TIME,
      events: [
        {
          event: ClientEvents.ROOM_PROMPT,
          payload: promptStrokes,
        },
      ],
    };
  }

  async drawing(room: GameRoom) {
    room.phase = GamePhase.DRAWING;
    await this.cacheService.saveRoom(room.roomId, room);

    return {
      timeLeft: room.settings.drawingTime,
      events: [],
    };
  }

  async roundReplay(room: GameRoom) {
    room.phase = GamePhase.ROUND_REPLAY;
    await this.cacheService.saveRoom(room.roomId, room);

    const result = await this.getRoundReplayData(room.roomId);

    return {
      timeLeft: ROUND_REPLAY_TIME,
      events: [
        {
          event: ClientEvents.ROOM_ROUND_REPLAY,
          payload: result,
        },
      ],
    };
  }

  async roundStanding(room: GameRoom) {
    room.phase = GamePhase.ROUND_STANDING;
    await this.cacheService.saveRoom(room.roomId, room);

    const result = await this.getRoundStandingData(room.roomId);

    return {
      timeLeft: ROUND_STANDING_TIME,
      events: [
        {
          event: ClientEvents.ROOM_ROUND_STANDING,
          payload: result,
        },
      ],
    };
  }

  async gameEnd(room: GameRoom) {
    room.phase = GamePhase.GAME_END;
    await this.cacheService.saveRoom(room.roomId, room);

    const finalResult = await this.getGameEndData(room.roomId);

    return {
      timeLeft: GAME_END_TIME,
      events: [
        {
          event: ClientEvents.ROOM_GAME_END,
          payload: finalResult,
        },
      ],
    };
  }

  async getRoundReplayData(roomId: string) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) return null;

    const roundResults = await this.progressCacheService.getRoundResults(
      room.roomId,
      room.currentRound,
    );

    const playerMapper = createPlayerMapper(room.players);

    const rankings = roundResults
      .sort((a, b) => b.similarity.similarity - a.similarity.similarity)
      .map((value) => ({
        ...value,
        nickname: playerMapper[value.socketId]?.nickname,
        profileId: playerMapper[value.socketId]?.profileId,
      }));

    return {
      rankings: rankings,
      promptStrokes:
        (await this.promptService.getPromptForRound(
          room.roomId,
          room.currentRound,
        )) || [],
    };
  }

  async getRoundStandingData(roomId: string) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) return null;

    const standings = await this.standingsCacheService.getStandings(
      room.roomId,
    );
    const playerMapper = createPlayerMapper(room.players);

    const rankings = standings.map((value) => ({
      ...value,
      nickname: playerMapper[value.socketId]?.nickname,
      profileId: playerMapper[value.socketId]?.profileId,
    }));

    return { rankings };
  }

  async getGameEndData(roomId: string) {
    const room = await this.cacheService.getRoom(roomId);
    if (!room) return null;

    const standings = await this.standingsCacheService.getStandings(
      room.roomId,
    );

    const playerMapper = createPlayerMapper(room.players);

    const rankings = standings.map((value) => ({
      ...value,
      nickname: playerMapper[value.socketId]?.nickname,
      profileId: playerMapper[value.socketId]?.profileId,
    }));

    const champion = rankings[0];

    if (!champion) {
      return null;
    }

    const highlight = await this.progressCacheService.getHighlight(
      room.roomId,
      champion.socketId,
      room.settings.totalRounds,
    );

    if (!highlight) {
      return null;
    }

    return {
      finalRankings: rankings,
      highlight: {
        promptStrokes:
          (await this.promptService.getPromptForRound(
            room.roomId,
            highlight.round,
          )) || [],
        playerStrokes: highlight.strokes,
        similarity: highlight.similarity,
      },
    };
  }
}
