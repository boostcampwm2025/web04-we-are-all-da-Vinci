// en-CA 로케일은 YYYY-MM-DD를 그대로 낸다. 서버(server-toss)의 일일 경계와 같은 KST 축.
const KST_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
});

/**
 * KST 기준 날짜 문자열(YYYY-MM-DD).
 * "오늘" 단위 리소스의 queryKey·세션키에 쓴다 — 디바이스 타임존과 무관하게 서버 날짜와 맞는다.
 * (`formatLocalDate`는 디바이스 로컬 기준이라 이 용도로 쓰지 않는다.)
 */
export const getKstDate = (date: Date = new Date()): string =>
  KST_DATE_FORMAT.format(date);
