import { z } from "zod";
import { GamePhase } from "../constants/index";

export const PhaseSchema = z.enum([
  GamePhase.WAITING,
  GamePhase.PROMPT,
  GamePhase.DRAWING,
  GamePhase.ROUND_REPLAY,
  GamePhase.ROUND_STANDING,
  GamePhase.GAME_END,
]);

export const PlayerSchema = z.object({
  socketId: z.string(),
  nickname: z.string().min(1).max(10),
  profileId: z.string(),
  isHost: z.boolean().optional(),
});

export const SettingsSchema = z.object({
  drawingTime: z.number().int().min(10).max(120),
  totalRounds: z.number().int().min(1).max(10),
  maxPlayer: z.number().int().min(2).max(100),
});

export const GameRoomSchema = z.object({
  roomId: z.string(),
  players: z.array(PlayerSchema),
  phase: PhaseSchema,
  currentRound: z.number().int().min(0),
  settings: SettingsSchema,
});
