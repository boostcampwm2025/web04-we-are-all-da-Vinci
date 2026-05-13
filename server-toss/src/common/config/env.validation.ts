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

// ConfigModule validate 단계에서는 chance whitelist 두 키만 검사한다.
export const validateChanceWhitelistEnv = (
  config: Record<string, unknown>,
): Record<string, unknown> => {
  validateWhitelist("AD_GROUP_ID_WHITELIST", config.AD_GROUP_ID_WHITELIST);
  validateWhitelist(
    "SHARE_MODULE_ID_WHITELIST",
    config.SHARE_MODULE_ID_WHITELIST,
  );
  return config;
};
