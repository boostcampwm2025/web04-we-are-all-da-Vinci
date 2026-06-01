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

export const getSeoulDateTime = (date: Date = new Date()) => {
  return new Date(date.getTime() + SEOUL_TIMEZONE_OFFSET_MS);
};
