// Re-export zod for consistent instance usage
export { z } from 'zod';

// Base schemas
export {
  ColorSchema,
  StrokeSchema,
  SimilaritySchema,
} from './base.schema';

// Entity schemas
export {
  PhaseSchema,
  PlayerSchema,
  SettingsSchema,
  GameRoomSchema,
} from './entity.schema';

// Game schemas
export {
  CreateRoomSchema,
  CreateRoomResponseSchema,
  RoomSettingsSchema,
  RoomStartSchema,
  UserJoinSchema,
  UserKickSchema,
} from './game.schema';

// Play schemas
export {
  UserScoreSchema,
  UserDrawingSchema,
  UserPracticeSchema,
} from './play.schema';

// Round schemas
export {
  RoomPromptSchema,
  RoomTimerSchema,
  RoomRoundReplaySchema,
  RoomRoundStandingSchema,
  HighlightSchema,
  RoomGameEndSchema,
  RoomLeaderboardSchema,
  UserWaitlistSchema,
  RoomKickedSchema,
  ErrorResponseSchema,
} from './round.schema';

// Chat schemas
export {
  SystemMessageTypeSchema,
  ChatMessageSchema,
  ChatMessagePayloadSchema,
  ChatHistoryPayloadSchema,
  ChatErrorSchema,
} from './chat.schema';

// Result schemas
export {
  PlayerResultSchema,
  RoundResultEntrySchema,
  GameResultEntrySchema,
  FinalResultSchema,
  RankingEntrySchema,
  PlayerScoreSchema,
  LeaderboardEntrySchema,
} from './result.schema';
