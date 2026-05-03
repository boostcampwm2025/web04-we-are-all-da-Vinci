import { z } from "zod";

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const UserInfoResponseSchema = z.object({
  userKey: z.number(),
  name: z.string(),
  gender: z.string().nullable().optional(),
  birthday: z.string().nullable().optional(),
});
export type UserInfoResponse = z.infer<typeof UserInfoResponseSchema>;
