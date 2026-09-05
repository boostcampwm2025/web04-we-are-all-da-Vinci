/**
 * Sentry로 나가는 이벤트·브레드크럼에서 인증 정보를 지운다.
 * 키 이름 매칭만으로는 브레드크럼 메시지·URL에 섞여 나가는 토큰을 못 잡으므로
 * 값 패턴(Bearer 접두, JWT 형태)도 함께 지운다.
 */
const SENSITIVE_KEY_PATTERN =
  /authorization|access_token|accesstoken|authorizationcode|refresh_token|cookie/i;

const TOKEN_VALUE_PATTERN = /Bearer\s+[\w\-.~+/]+=*|eyJ[\w-]+\.[\w-]+\.[\w-]+/g;

const MASK = "[redacted]";

const MAX_DEPTH = 8;

export const scrubString = (value: string): string =>
  value.replace(TOKEN_VALUE_PATTERN, MASK);

export const scrubDeep = <T>(input: T, depth = 0): T => {
  if (depth > MAX_DEPTH) return input;
  if (typeof input === "string") return scrubString(input) as T;
  if (Array.isArray(input))
    return input.map((item) => scrubDeep(item, depth + 1)) as T;
  if (input !== null && typeof input === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? MASK
        : scrubDeep(value, depth + 1);
    }
    return output as T;
  }
  return input;
};
