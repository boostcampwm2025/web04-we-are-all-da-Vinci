const SEOUL_TIMEZONE_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_DURATION_MS = 24 * 60 * 60 * 1000;

export const getSeoulDayRange = (reference = new Date()) => {
  const seoulNow = new Date(reference.getTime() + SEOUL_TIMEZONE_OFFSET_MS);
  const startTime = Date.UTC(
    seoulNow.getUTCFullYear(),
    seoulNow.getUTCMonth(),
    seoulNow.getUTCDate(),
  );

  const start = new Date(startTime - SEOUL_TIMEZONE_OFFSET_MS);
  const end = new Date(start.getTime() + DAY_DURATION_MS);

  return { start, end };
};

// 알림 referenceId·이벤트 payload의 일관 표기를 위한 KST 날짜 문자열(YYYY-MM-DD).
export const formatKstDate = (date: Date = new Date()): string => {
  const seoul = new Date(date.getTime() + SEOUL_TIMEZONE_OFFSET_MS);
  return seoul.toISOString().slice(0, 10);
};

export const getSeoulDateTime = (date: Date = new Date()) => {
  return new Date(date.getTime() + SEOUL_TIMEZONE_OFFSET_MS);
};
