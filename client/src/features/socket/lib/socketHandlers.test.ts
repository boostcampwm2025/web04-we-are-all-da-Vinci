import type { GameRoom } from '@/entities/gameRoom';
import type { RankingEntry } from '@/entities/ranking';
import type { Phase } from '@/shared/config';
import { describe, expect, it } from 'vitest';
import {
  buildRankings,
  processRoomMetadata,
  type ServerRankingEntry,
} from './socketHandlers';

// 테스트용 헬퍼
const makeServerEntry = (
  overrides: Partial<ServerRankingEntry> = {},
): ServerRankingEntry => ({
  socketId: 'socket-1',
  nickname: 'player1',
  profileId: 'profile-1',
  similarity: 80,
  ...overrides,
});

const makeRankingEntry = (
  overrides: Partial<RankingEntry> = {},
): RankingEntry => ({
  socketId: 'socket-1',
  nickname: 'player1',
  profileId: 'profile-1',
  similarity: 80,
  rank: 1,
  previousRank: null,
  ...overrides,
});

const makeRoomData = (overrides: Partial<GameRoom> = {}): GameRoom => ({
  roomId: 'room-1',
  players: [
    {
      socketId: 'socket-1',
      nickname: 'player1',
      profileId: 'profile-1',
      isHost: true,
    },
  ],
  phase: 'WAITING' as Phase,
  currentRound: 1,
  settings: { drawingTime: 90, totalRounds: 5, maxPlayer: 8 },
  ...overrides,
});

describe('buildRankings', () => {
  it('서버 데이터 순서대로 rank를 부여한다', () => {
    const serverData = [
      makeServerEntry({ socketId: 'a', similarity: 90 }),
      makeServerEntry({ socketId: 'b', similarity: 70 }),
    ];

    const result = buildRankings(serverData, []);

    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
  });

  it('이전 순위를 올바르게 매핑한다', () => {
    const currentRankings = [
      makeRankingEntry({ socketId: 'a', rank: 1 }),
      makeRankingEntry({ socketId: 'b', rank: 2 }),
    ];
    const serverData = [
      makeServerEntry({ socketId: 'b', similarity: 90 }),
      makeServerEntry({ socketId: 'a', similarity: 70 }),
    ];

    const result = buildRankings(serverData, currentRankings);

    expect(result[0].previousRank).toBe(2); // b: 2등 → 1등
    expect(result[1].previousRank).toBe(1); // a: 1등 → 2등
  });

  it('신규 플레이어의 이전 순위는 null이다', () => {
    const result = buildRankings([makeServerEntry({ socketId: 'new' })], []);

    expect(result[0].previousRank).toBeNull();
  });

  it('빈 서버 데이터는 빈 배열을 반환한다', () => {
    const result = buildRankings([], []);

    expect(result).toEqual([]);
  });

  it('서버 데이터의 필드가 그대로 전달된다', () => {
    const serverData = [
      makeServerEntry({
        socketId: 'a',
        nickname: 'Alice',
        profileId: 'p-a',
        similarity: 95,
      }),
    ];

    const result = buildRankings(serverData, []);

    expect(result[0]).toEqual({
      socketId: 'a',
      nickname: 'Alice',
      profileId: 'p-a',
      similarity: 95,
      rank: 1,
      previousRank: null,
    });
  });
});

describe('processRoomMetadata', () => {
  it('GAME_END → WAITING 전환 시 초기화 플래그를 true로 설정한다', () => {
    const data = makeRoomData({ phase: 'WAITING' });

    const result = processRoomMetadata(data, 'GAME_END', 'socket-1');

    expect(result.shouldResetGameData).toBe(true);
  });

  it('같은 페이즈면 초기화 플래그를 false로 설정한다', () => {
    const data = makeRoomData({ phase: 'WAITING' });

    const result = processRoomMetadata(data, 'WAITING', 'socket-1');

    expect(result.shouldResetGameData).toBe(false);
  });

  it('DRAWING → WAITING 등 다른 전환은 초기화 플래그를 false로 설정한다', () => {
    const data = makeRoomData({ phase: 'WAITING' });

    const result = processRoomMetadata(data, 'DRAWING', 'socket-1');

    expect(result.shouldResetGameData).toBe(false);
  });

  it('플레이어 목록에 포함되면 isJoined가 true이다', () => {
    const data = makeRoomData({
      players: [
        {
          socketId: 'socket-1',
          nickname: 'p1',
          profileId: 'profile-1',
          isHost: true,
        },
      ],
    });

    const result = processRoomMetadata(data, 'WAITING', 'socket-1');

    expect(result.isJoined).toBe(true);
  });

  it('플레이어 목록에 없으면 isJoined가 false이다', () => {
    const data = makeRoomData({
      players: [
        {
          socketId: 'other',
          nickname: 'p2',
          profileId: 'profile-2',
          isHost: true,
        },
      ],
    });

    const result = processRoomMetadata(data, 'WAITING', 'socket-1');

    expect(result.isJoined).toBe(false);
  });

  it('참가한 유저는 서버 페이즈를 따른다', () => {
    const data = makeRoomData({
      phase: 'DRAWING',
      players: [
        {
          socketId: 'socket-1',
          nickname: 'p1',
          profileId: 'profile-1',
          isHost: false,
        },
      ],
    });

    const result = processRoomMetadata(data, 'WAITING', 'socket-1');

    expect(result.roomUpdate.phase).toBe('DRAWING');
  });

  it('미참가 유저는 현재 페이즈를 유지한다', () => {
    const data = makeRoomData({
      phase: 'DRAWING',
      players: [
        {
          socketId: 'other',
          nickname: 'p2',
          profileId: 'profile-2',
          isHost: true,
        },
      ],
    });

    const result = processRoomMetadata(data, 'WAITING', 'socket-1');

    expect(result.roomUpdate.phase).toBe('WAITING');
  });

  it('roomUpdate에 필요한 필드가 모두 포함된다', () => {
    const data = makeRoomData();

    const result = processRoomMetadata(data, 'WAITING', 'socket-1');

    expect(result.roomUpdate).toHaveProperty('roomId');
    expect(result.roomUpdate).toHaveProperty('players');
    expect(result.roomUpdate).toHaveProperty('phase');
    expect(result.roomUpdate).toHaveProperty('currentRound');
    expect(result.roomUpdate).toHaveProperty('settings');
  });
});
