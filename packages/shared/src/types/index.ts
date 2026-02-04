import { z } from 'zod';
import * as schemas from '../schemas/index';

// ============ Base Types ============
export type Color = z.infer<typeof schemas.ColorSchema>;
export type Stroke = z.infer<typeof schemas.StrokeSchema>;
export type Similarity = z.infer<typeof schemas.SimilaritySchema>;

// ============ Entity Types ============
export type Phase = z.infer<typeof schemas.PhaseSchema>;
export type Player = z.infer<typeof schemas.PlayerSchema>;
export type Settings = z.infer<typeof schemas.SettingsSchema>;
export type GameRoom = z.infer<typeof schemas.GameRoomSchema>;

// ============ Game DTOs ============
export type CreateRoomDto = z.infer<typeof schemas.CreateRoomSchema>;
export type CreateRoomResponse = z.infer<typeof schemas.CreateRoomResponseSchema>;
export type RoomSettingsDto = z.infer<typeof schemas.RoomSettingsSchema>;
export type RoomStartDto = z.infer<typeof schemas.RoomStartSchema>;
export type UserJoinDto = z.infer<typeof schemas.UserJoinSchema>;
export type UserKickDto = z.infer<typeof schemas.UserKickSchema>;

// ============ Play DTOs ============
export type UserScoreDto = z.infer<typeof schemas.UserScoreSchema>;
export type UserDrawingDto = z.infer<typeof schemas.UserDrawingSchema>;
export type UserPracticeDto = z.infer<typeof schemas.UserPracticeSchema>;

// ============ Round DTOs ============
export type RoomPromptDto = z.infer<typeof schemas.RoomPromptSchema>;
export type RoomTimerDto = z.infer<typeof schemas.RoomTimerSchema>;
export type RoomRoundReplayDto = z.infer<typeof schemas.RoomRoundReplaySchema>;
export type RoomRoundStandingDto = z.infer<typeof schemas.RoomRoundStandingSchema>;
export type Highlight = z.infer<typeof schemas.HighlightSchema>;
export type RoomGameEndDto = z.infer<typeof schemas.RoomGameEndSchema>;
export type RoomLeaderboardDto = z.infer<typeof schemas.RoomLeaderboardSchema>;
export type UserWaitlistDto = z.infer<typeof schemas.UserWaitlistSchema>;

// ============ Chat Types ============
export type SystemMessageType = z.infer<typeof schemas.SystemMessageTypeSchema>;
export type ChatMessage = z.infer<typeof schemas.ChatMessageSchema>;
export type ChatMessagePayload = z.infer<typeof schemas.ChatMessagePayloadSchema>;
export type ChatHistoryPayload = z.infer<typeof schemas.ChatHistoryPayloadSchema>;
export type ChatError = z.infer<typeof schemas.ChatErrorSchema>;

// ============ Result Types ============
export type PlayerResult = z.infer<typeof schemas.PlayerResultSchema>;
export type RoundResultEntry = z.infer<typeof schemas.RoundResultEntrySchema>;
export type GameResultEntry = z.infer<typeof schemas.GameResultEntrySchema>;
export type FinalResult = z.infer<typeof schemas.FinalResultSchema>;
export type RankingEntry = z.infer<typeof schemas.RankingEntrySchema>;
export type PlayerScore = z.infer<typeof schemas.PlayerScoreSchema>;
export type LeaderboardEntry = z.infer<typeof schemas.LeaderboardEntrySchema>;
