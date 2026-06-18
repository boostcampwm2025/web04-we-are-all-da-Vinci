import { z } from "zod";

export const LogoutCallbackSchema = z.object({
  userKey: z.number(),
  referrer: z.enum(["UNLINK", "WITHDRAWAL_TERMS", "WITHDRAWAL_TOSS"]),
});

export class LogoutCallbackDto {
  userKey!: number;
  referrer!: "UNLINK" | "WITHDRAWAL_TERMS" | "WITHDRAWAL_TOSS";
}
