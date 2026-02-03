import { z } from "zod";

// Request DTOs
export const CreateRoomSchema = z.object({
  maxPlayer: z.number().int().min(2).max(8),
  totalRounds: z.number().int().min(1).max(10),
  drawingTime: z.number().int().min(10).max(120),
});

export const RoomSettingsSchema = z.object({
  roomId: z.string(),
  maxPlayer: z.number().int().min(2).max(100),
  totalRounds: z.number().int().min(1).max(10),
  drawingTime: z.number().int().min(10).max(120),
});

export const RoomStartSchema = z.object({
  roomId: z.string(),
});

export const UserJoinSchema = z.object({
  roomId: z.string(),
  nickname: z.string().min(1).max(10),
  profileId: z.string(),
});

export const UserKickSchema = z.object({
  roomId: z.string(),
  targetPlayerId: z.string(),
});

// Response DTOs
export const CreateRoomResponseSchema = z.object({
  roomId: z.string(),
});
