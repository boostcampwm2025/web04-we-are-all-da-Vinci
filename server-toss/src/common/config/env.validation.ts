import { z } from "zod";

const hasAtLeastOneCsvToken = (value: string): boolean =>
  value
    .split(",")
    .map((token) => token.trim())
    .some(Boolean);

const RequiredWhitelistSchema = z
  .string()
  .trim()
  .min(1, "필수 환경변수예요.")
  .refine(hasAtLeastOneCsvToken, {
    message: "최소 1개 이상의 유효한 값을 포함해야 해요.",
  });

const validateWhitelist = (key: string, value: unknown): void => {
  const parsed = RequiredWhitelistSchema.safeParse(value);
  if (parsed.success) return;

  const detail = parsed.error.issues.map((issue) => issue.message).join(", ");
  throw new Error(`환경변수 검증 실패: ${key}: ${detail}`);
};

const NonEmptyStringSchema = z.string().trim().min(1, "필수 환경변수예요.");

const validateNonEmpty = (key: string, value: unknown): void => {
  const parsed = NonEmptyStringSchema.safeParse(value);
  if (parsed.success) return;

  const detail = parsed.error.issues.map((issue) => issue.message).join(", ");
  throw new Error(`환경변수 검증 실패: ${key}: ${detail}`);
};

const OptionalBooleanStringSchema = z
  .enum(["true", "false"])
  .optional()
  .or(z.literal("").transform(() => undefined));

const validateOptionalBoolean = (key: string, value: unknown): void => {
  const parsed = OptionalBooleanStringSchema.safeParse(value);
  if (parsed.success) return;

  throw new Error(`환경변수 검증 실패: ${key}: true 또는 false만 허용돼요.`);
};

// ConfigModule validate 단계에서 검사하는 필수 env 모음.
export const validateChanceWhitelistEnv = (
  config: Record<string, unknown>,
): Record<string, unknown> => {
  validateWhitelist("AD_GROUP_ID_WHITELIST", config.AD_GROUP_ID_WHITELIST);
  validateWhitelist(
    "SHARE_MODULE_ID_WHITELIST",
    config.SHARE_MODULE_ID_WHITELIST,
  );
  validateOptionalBoolean(
    "DAILY_PROMPT_NOTIFICATION_ENABLED",
    config.DAILY_PROMPT_NOTIFICATION_ENABLED,
  );
  if (config.DAILY_PROMPT_NOTIFICATION_ENABLED === "true") {
    validateNonEmpty(
      "TOSS_TEMPLATE_DAILY_PROMPT",
      config.TOSS_TEMPLATE_DAILY_PROMPT,
    );
  }
  validateOptionalBoolean(
    "OVERTAKEN_NOTIFICATION_ENABLED",
    config.OVERTAKEN_NOTIFICATION_ENABLED,
  );
  if (config.OVERTAKEN_NOTIFICATION_ENABLED === "true") {
    validateNonEmpty("TOSS_TEMPLATE_OVERTAKEN", config.TOSS_TEMPLATE_OVERTAKEN);
  }
  validateOptionalBoolean(
    "ATTENDANCE_STREAK_NOTIFICATION_ENABLED",
    config.ATTENDANCE_STREAK_NOTIFICATION_ENABLED,
  );
  if (config.ATTENDANCE_STREAK_NOTIFICATION_ENABLED === "true") {
    validateNonEmpty(
      "TOSS_TEMPLATE_ATTENDANCE_STREAK",
      config.TOSS_TEMPLATE_ATTENDANCE_STREAK,
    );
  }
  return config;
};
